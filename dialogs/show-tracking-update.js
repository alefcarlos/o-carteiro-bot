const builder = require('botbuilder');
const carteiroAPI = require('../carteiro-api');
const carteiroUtils = require('../carteiro-utils');

//Exibe mensagem dizendo que o item já foi entregue
module.exports = function (session, args) {
    console.log("[docs/show-tracking-update.js]Iniciando diálogo: show-tracking-update");

    if (session.userData.trackingHistory == undefined)
        return;

    console.log("[docs/show-tracking-update.js]Encontrou informações do usuário");

    let _trackingUpdateIndex = carteiroUtils.getTrackingIndex(session.userData.trackingHistory, args.code);

    console.log("[docs/show-tracking-update.js]Encontrou registro para atualizar");

    if (_trackingUpdateIndex == -1)
        return;

    session.send("Ei, psiu ! Uma nova atualização de rastreio ;)");

    let _entityToUpdate = session.userData.trackingHistory[_trackingUpdateIndex];

    _entityToUpdate.lastType = args.type;
    _entityToUpdate.lastStatus = args.status;
    _entityToUpdate.lastDescription = args.description;
    _entityToUpdate.trackingTime = new Date().toISOString();
    _entityToUpdate.lastDestination = args.destination;

    const msg = new builder.Message(session);
    msg.addAttachment(new builder.HeroCard(session)
        .title(_entityToUpdate.trackingCode)
        .subtitle(`${_entityToUpdate.lastDescription}`)
        .text(_entityToUpdate.lastDestination));

    session.send(msg).endDialog();
    console.log("[docs/show-tracking-update.js]Mensagem enviada..");

}