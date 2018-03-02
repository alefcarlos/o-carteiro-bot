const builder = require('botbuilder');
const carteiroUtils = require('../carteiro-utils');

//Diálogo para mostrar os itens do histórico do usuário
module.exports = function (session) {
    console.log("[docs/tracking-history.js]Iniciando diálogo: tracking-history");
        
    if (session.userData.trackingHistory == undefined)
        session.userData.trackingHistory = [];
        
    if (session.userData.trackingHistory.length === 0) {
        const msg = new builder.Message(session)
            .text(carteiroUtils.formatMessageWithUserName(session, 'Não encontrei itens para exibir, que tal rastrear agora ?'))
            .suggestedActions(
                builder.SuggestedActions.create(
                    session, [builder.CardAction.imBack(session, "rastrear", "Rastrear")]
                ));

        session.send(msg).endConversation();
    }
    else {
        session.send(buildHistoryList(session)).endConversation();
    }
};

//Auxiliares
let buildHistoryList = (session) => {
    const _msg = new builder.Message(session);
    _msg.attachmentLayout(builder.AttachmentLayout.carousel);

    let _element = null;
    let card = null;

    for (let index = 0; index < session.userData.trackingHistory.length; index++) {
        _element = session.userData.trackingHistory[index];
        card = new builder.HeroCard(session)
            .title(`Informações do rastreio ${_element.trackingCode}`)
            //.subtitle(`Última atualização: ${_lastEvent.data} às ${_lastEvent.hora}`)
            .text(`${_element.lastDescription}`);

        //Senão estiver finalizado, adicionar botão para rastreio
        if (!carteiroUtils.trackingIsFinished(_element))
            card.buttons([builder.CardAction.imBack(session, `rastrear ${_element.trackingCode}`, "Rastrear")]);

        _msg.addAttachment(card);
    }

    return _msg;
};