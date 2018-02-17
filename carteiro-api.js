const axios = require('axios');

/*eslint no-console: ["error", { allow: ["warn","log","error"] }] */

/**
 * Adiciona um novo registro de noificação
 * @param {*} address Informações da conversa
 */
let addNewSubscribe = (addressInfo) => {
    const _url = `${process.env.CarteiroAPIUrl}/subscriptions`;
    const _request = axios.post(_url, {
        address: addressInfo
    })

    return _request;
};

/**
 * Adiciona um novo registro de monitoramento
 * @param {string} trackingCode Código de rastreio
 * @param {*} address Informações da conversa
 */
let addNewTracking = (trackingCode, addressInfo) => {
    const _url = `${process.env.CarteiroAPIUrl}/tracking`;
    const _request = axios.post(_url, {
        code: trackingCode,
        address: addressInfo
    })

    return _request;
};

/** Obtém todos os rastreios que têm informações atualizadas */
let getTrackings = () => {
    const _url = `${process.env.CarteiroAPIUrl}/tracking/notify`;
    const _request = axios.get(_url);

    return _request;
}

/** Obtém todas as notificações pendentes de leitura */
let getNotifications = () => {
    const _url = `${process.env.CarteiroAPIUrl}/notify`;
    const _request = axios.get(_url);

    return _request;
}

/** Atualiza todas as notificações como lida */
let setNotificationsRead = () => {
    const _url = `${process.env.CarteiroAPIUrl}/notify/seen`;
    const _request = axios.put(_url);

    return _request;
}

/**
 * Atualiza todas as notificações de tracking para lido
 */
let setTrackingsSeen = () => {
    const _url = `${process.env.CarteiroAPIUrl}/tracking/seen`;
    const _request = axios.put(_url);

    return _request;
}

module.exports = {
    addNewSubscribe,
    addNewTracking,
    getTrackings,
    getNotifications,
    setNotificationsRead,
    setTrackingsSeen,
};