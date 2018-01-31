const builder = require('botbuilder');
const carteiroUtils = require('../carteiro-utils');

// Diálogo que mostra o resultado da pesquisa
module.exports = function (session, args) {
    const msg = new builder.Message(session);
    const _data = args.data;
    const _lastEvent = _data.evento[0];

    //Armazenar informações do rastreio do usuário
    addUserTrackingHistory(session, _data);

    msg.addAttachment(new builder.HeroCard(session)
        .title(`${_lastEvent.descricao}`)
        .subtitle(carteiroUtils.getTrackingDestination(_data))
        .text(`Última atualização: ${_lastEvent.data} às ${_lastEvent.hora}`));

    session.send(msg).endDialog();
};

//Métodos auxiliares
/**
 * Adiciona um registro no histórico do usuário
 * @param {*} session Session
 * @param {*} info Informações do rastreio
 * @returns {Boolean} Retorna true quando tudo finalizado.
 */
let addUserTrackingHistory = function (session, info) {
    const _lastEvent = info.evento[0];

    //Verifica se existe já existe o código, então atualizar somente os status
    let _trackingUpdateIndex = carteiroUtils.getTrackingIndex(session.userData.trackingHistory, info.numero);

    if (_trackingUpdateIndex === -1) {
        session.userData.trackingHistory.push(carteiroUtils.trackingInfoToHistory(info));
    }
    else {
        let _entityToUpdate = session.userData.trackingHistory[_trackingUpdateIndex];

        _entityToUpdate.lastType = _lastEvent.tipo;
        _entityToUpdate.lastStatus = _lastEvent.status;
        _entityToUpdate.lastDescription = _lastEvent.descricao;
        _entityToUpdate.trackingTime = new Date().toISOString();
        _entityToUpdate.lastDestination = carteiroUtils.getTrackingDestination(info);
    }

    return true;
};