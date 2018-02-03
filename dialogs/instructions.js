const builder = require('botbuilder');

module.exports = function (session) {
    const msg = new builder.Message(session)
        .text(`${session.userData.userName}, diga o que você gostaria de fazer, por exemplo: 'rastrear meu item' ou 'ver histórico de pesquisa'. Você pode até me passar o código junto: rastrear AA100833276BR"`)
        .suggestedActions(
        builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "rastrear", "Rastrear"),
                builder.CardAction.imBack(session, "ver histórico", "Ver histórico")
            ]
        ));

    session.send(msg).endDialog();
};