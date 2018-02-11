const builder = require('botbuilder');
const carteiroAPI = require('../carteiro-api');
const carteiroUtils = require('../carteiro-utils');

//Exibe mensagem dizendo que o item já foi entregue
module.exports = function (session, args) {
    if (session.userData.trackingHistory == undefined)
        return;

    let _trackingUpdateIndex = carteiroUtils.getTrackingIndex(session.userData.trackingHistory, args.code);

    if (_trackingUpdateIndex == -1)
        return;

    session.send("Uma nova atualização de status para você !");

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

    carteiroAPI.setSeen(args.id)
        .then(() => { })
        .catch((error) => {
            console.log(error.message);
        });
}