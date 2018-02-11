const axios = require('axios');

/*eslint no-console: ["error", { allow: ["warn","log","error"] }] */

/**
 * Adiciona um novo registro de monitoramento
 * @param {string} trackingCode Código de rastreio
 * @param {*} address Informações da conversa
 */
let addNewSubscribe = (trackingCode, addressInfo) => {
    const _url = `${process.env.CarteiroAPIUrl}/subscribe`;
    const _request = axios.post(_url, {
        code: trackingCode,
        address: addressInfo
    })

    return _request;
};

/** Obtém todos os rastreios que têm informações atualizadas */
let getTrackings = () =>{
    const _url = `${process.env.CarteiroAPIUrl}/tracking/notify`;
    const _request = axios.get(_url);

    return _request;    
}

/**
 * Marca uma notificação de atualização de entregua como vista
 * @param {int} trackingId ID do tracking a ser atualizado
 */
let setSeen = (trackingId) =>{
    const _url = `${process.env.CarteiroAPIUrl}/tracking/${trackingId}/seen`;
    const _request = axios.put(_url);

    return _request;
}

module.exports = {
    addNewSubscribe,
    getTrackings,
    setSeen
};