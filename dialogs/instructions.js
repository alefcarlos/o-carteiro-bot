const builder = require('botbuilder');
const carteiroUtils = require('../carteiro-utils');

module.exports = function (session) {
    console.log("[docs/instructions.js]Iniciando diálogo: inscrutions");

    const msgString = "Diga o que você gostaria de fazer, por exemplo: 'rastrear meu item' ou 'ver histórico de pesquisa'. Você pode até me passar o código junto: rastrear AA100833276BR";

    const msg = new builder.Message(session)
        .text(carteiroUtils.formatMessageWithUserName(session, msgString))
        .suggestedActions(
        builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "rastrear", "Rastrear"),
                builder.CardAction.imBack(session, "ver histórico", "Ver histórico")
            ]
        ));

    session.send(msg).endDialog();
};