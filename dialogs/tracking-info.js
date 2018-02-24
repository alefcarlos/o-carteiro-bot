const builder = require('botbuilder');
const carteiroUtils = require('../carteiro-utils');

// Diálogo que mostra o resultado da pesquisa
module.exports = function (session, args) {
    // const msg = new builder.Message(session);
    const _data = args.data;
    const _lastEvent = _data.evento[0];

    //Armazenar informações do rastreio do usuário
    const _trackingIndex = addUserTrackingHistory(session, _data);

    // msg.addAttachment(new builder.HeroCard(session)
    //     .title(`${_lastEvent.descricao}`)
    //     .subtitle(carteiroUtils.getTrackingDestination(_data))
    //     .text(`Última atualização: ${_lastEvent.data} às ${_lastEvent.hora}`));

    var msg = new builder.Message(session)
        .addAttachment({
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
                type: "AdaptiveCard",
                body: [
                    {
                        "type": "TextBlock",
                        "text": `${_lastEvent.descricao}`,
                        "size": "large",
                        "weight": "bolder"
                    },
                    {
                        "type": "TextBlock",
                        "text": `${carteiroUtils.getTrackingDestination(_data)}`,
                        "weight": "bolder"
                    },
                    {
                        "type": "TextBlock",
                        "text": `Última atualização: ${_lastEvent.data} às ${_lastEvent.hora}`
                    }
                ]
            }
        });

    session.send(msg);

    if (process.env.CarteiroAPIUrl) {
        if (carteiroUtils.trackingIsFinished(session.userData.trackingHistory[_trackingIndex])) {
            session.replaceDialog('finishingTalk'); //Devemos finalizar
        }
        else {
            //devemos iniciar o diálogo que pergunta se deseja ser notificado
            // requestTracking(session);
            session.replaceDialog('askForTrackingUpdate');
        }
    } else {
        session.replaceDialog('finishingTalk'); //Devemos finalizar
    }

};

//Métodos auxiliares
/**
 * Adiciona um registro no histórico do usuário
 * @param {*} session Session
 * @param {*} info Informações do rastreio
 * @returns {Boolean} Retorna o index do elemento adicionado/atualizado
 */
let addUserTrackingHistory = function (session, info) {
    const _lastEvent = info.evento[0];

    //Verifica se existe já existe o código, então atualizar somente os status
    let _trackingUpdateIndex = carteiroUtils.getTrackingIndex(session.userData.trackingHistory, info.numero);

    if (_trackingUpdateIndex === -1) {
        session.userData.trackingHistory.push(carteiroUtils.trackingInfoToHistory(info));

        return session.userData.trackingHistory.length - 1;
    }


    let _entityToUpdate = session.userData.trackingHistory[_trackingUpdateIndex];

    _entityToUpdate.lastType = _lastEvent.tipo;
    _entityToUpdate.lastStatus = _lastEvent.status;
    _entityToUpdate.lastDescription = _lastEvent.descricao;
    _entityToUpdate.trackingTime = new Date().toISOString();
    _entityToUpdate.lastDestination = carteiroUtils.getTrackingDestination(info);

    return _trackingUpdateIndex;

};