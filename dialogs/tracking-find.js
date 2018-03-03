const builder = require('botbuilder');
const trackingCorreios = require('tracking-correios');
const carteiroUtils = require('../carteiro-utils');

//Perguntar sobre o código de rastreio
module.exports = [
    function (session, args, next) {
        console.log("[docs/tracking-find.js]Iniciando diálogo: tracking-find");
        console.log(`[docs/tracking-find.js]É uma nova tentativa de digitar o código ? ${args.reprompt != undefined}`);

        // Resolve and store any Tracking.Code entity passed from LUIS.
        // let _code = builder.EntityRecognizer.findEntity(args.entities, 'Tracking.Code');
        // let _trackingCode = _code ? _code.entity.toUpperCase() : '';

        // console.log(`[docs/tracking-find.js]Encontrou código de rastreio via luis ? ${_trackingCode != ''}`)

        let _trackingCode = ''

        //Se não encontrou via LUIS, então verificar por REGEX
        const rex = (/([A-Z]{2}[0-9]{9}[A-Z]{2}){1}/);
        const _found = session.message.text.trim().toUpperCase().match(rex);


        if (_found)
            _trackingCode = _found[0].toUpperCase();

        console.log(`[docs/tracking-find.js]Encontrou código de rastreio via regex ? ${_trackingCode != ''}`)

        session.conversationData.tracking = {
            code: _trackingCode
        };

        // Prompt for tracking code
        if (!_trackingCode) {
            console.log("[docs/tracking-find.js]Não obtivemos o código de rastreio, então perguntar pelo mesmo")

            if (args && args.reprompt)
                builder.Prompts.text(session, carteiroUtils.formatMessageWithUserName(session, 'Não entendi. Informe o código do rastreio, contém até 13 digitos. Exemplo: AA100833276BR.'));
            else
                builder.Prompts.text(session, carteiroUtils.formatMessageWithUserName(session, 'Qual código você gostaria de rastrear?'));
        }
        else {
            console.log(`[docs/tracking-find.js]Já temos o código [${_trackingCode}] então, rastrear!`)
            next();
        }
    },
    function (session, results) {
        console.log("[docs/tracking-find.js]Iniciando diálogo: tracking-find[2]");
        
        //Obter o código de rastreio, se já veio informado  ignorar
        const trackingInfo = session.conversationData.tracking;

        if (results.response) {
            trackingInfo.code = results.response.trim().toUpperCase();
        }

        //Verifica se o código passado é válido para requisição
        const _isCodeValid = (/^([A-Z]{2}[0-9]{9}[A-Z]{2}){1}$/).test(trackingInfo.code);

        if (!_isCodeValid) {
            session.replaceDialog('askForTrackingCode', { reprompt: true }); // Repeat the dialog
        }
        else {

            //Caso o usuário não tenha sido identificado
            if (session.userData.trackingHistory == undefined)
                session.userData.trackingHistory = [];

            //Código existe no histórico de pesquisa do usuário e está marcado como entregue, devemos simplesmente informar e não pesquisar na base dos correios
            const _trackingIndex = carteiroUtils.getTrackingIndex(session.userData.trackingHistory, trackingInfo.code);

            if (_trackingIndex >= 0 && carteiroUtils.trackingIsFinished(session.userData.trackingHistory[_trackingIndex])) {
                // session.replaceDialog('showTrackingIsFinished', { trackingCode: trackingInfo.code });
                session.send(`De acordo com seu histórico de rastreio, o item ${trackingInfo.code} já consta como entregue ;)`);
                session.replaceDialog('finishingTalk');
            }
            else {
                requestTracking(session);
            }
        }
    }
];

//Métodos auxiliares
let requestTracking = (session) => {
    const trackingCode = session.conversationData.tracking.code;
    let _msg = `Aguarde um momento enquanto busco as informações do código ${trackingCode}`;
    session.send(_msg);

    session.sendTyping();
    trackingCorreios.track(trackingCode, { filter: false }).then((result) => {
        _msg = '';

        if (result === null || result.lenght === 0) {
            session.send('Desculpe-me, mas ainda não foram encontradas informações com esse código');
            session.replaceDialog('finishingTalk');
        }
        else if (result && result[0].erro) {
            session.send(`Desculpe-me, mas não foram encontradas informações do pedido. O item pode ter sido recém postado.`);
            session.replaceDialog('finishingTalk');
        }
        else {
            session.replaceDialog('trackingInfo', { data: result[0] });
        }


    }).catch(() => {
        session.endConversation(`Desculpe-me, não consegui rastrear as informações agora, pois os serviços dos correios está fora.`);
    });
};