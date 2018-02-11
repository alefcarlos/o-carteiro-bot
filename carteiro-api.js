const axios = require('axios');

/*eslint no-console: ["error", { allow: ["warn","log","error"] }] */

/**
 * Adiciona um novo registro de monitoramento
 * @param {string} trackingCode Código de rastreio
 * @param {*} address Informações da conversa
 */
let addNewSubscribe = (trackingCode, addressInfo) => {
    var _request = axios.post('http://localhost:8080/subscribe', {
        code: trackingCode,
        address: addressInfo
    })

    return _request;
};

/** Obtém todos os rastreios que têm informações atualizadas */
let getTrackings = () =>{
    var _request = axios.get('http://localhost:8080/tracking/notify');

    return _request;    
}

module.exports = {
    addNewSubscribe,
    getTrackings
};