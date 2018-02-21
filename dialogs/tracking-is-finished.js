//Exibe mensagem dizendo que o item já foi entregue
module.exports = function (session, args) {
    session.send(`De acordo com seu histórico de rastreio, o item ${args.trackingCode} já consta como entregue ;)`);
    session.replaceDialog('finishingTalk');
};