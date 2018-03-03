const builder = require('botbuilder');
const carteiroUtils = require('../carteiro-utils');

module.exports = function (session) {
    console.log("[docs/instructions.js]Iniciando diálogo: instructions");

    const msgString = "Selecione abaixo o que você gostaria de fazer. Se você quiser, pode escrever: rastrear AA100833276BR, para pesquisar direto !";

    const msg = new builder.Message(session)
        .text(carteiroUtils.formatMessageWithUserName(session, msgString))
        .suggestedActions(
        builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "rastrear", "Rastrear"),
                builder.CardAction.imBack(session, "histórico", "Ver histórico")
            ]
        ));

    session.send(msg).endDialog();
};