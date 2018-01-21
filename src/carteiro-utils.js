'use strict';

/**
 * Lista de status que definem se o código
 * já foi entregue ao cliente
 */
const tracakingFinishedList = [
    {
        type: 'BDE',
        status: 0
    },
    {
        type: 'BDE',
        status: 1
    },
    {
        type: 'BDI',
        status: 0
    },
    {
        type: 'BDI',
        status: 1
    },
    {
        type: 'BDR',
        status: 0
    },
    {
        type: 'BDR',
        status: 1
    }
];

/**
 * Obtém a posição de um código de rastreio num array
 * @param {Array} array Lista de rastreios
 * @param {string} trackingCode Código a ser pesquisado
 * @returns {int} Retorna o index do elemento
 */
let getTrackingIndex = (array, trackingCode) => array.findIndex((element) => element.trackingCode === trackingCode);

/**
 * Valida se um rastreio foi finalizado
 * @param {*} trackingInfo Informações do rastreio
 * @returns {Boolean} Retorna true, se o item já está marcado como entregue ao usuário, senão false.
 */
let trackingIsFinished = (trackingInfo) => tracakingFinishedList.some((seachElement) => parseInt(seachElement.status, 10) === parseInt(trackingInfo.lastStatus, 10) && seachElement.type === trackingInfo.lastType);

module.exports = {
    tracakingFinishedList,
    getTrackingIndex,
    trackingIsFinished
};