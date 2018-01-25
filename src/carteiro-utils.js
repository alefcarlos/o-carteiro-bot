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
 * Valida se um rastreio da lista de histórico foi finalizado
 * @param {*} trackingInfo Informações do rastreio
 * @returns {Boolean} Retorna true, se o item já está marcado como entregue ao usuário, senão false.
 */
let trackingIsFinished = (trackingInfo) => tracakingFinishedList.some((seachElement) => parseInt(seachElement.status, 10) === parseInt(trackingInfo.lastStatus, 10) && seachElement.type === trackingInfo.lastType);

/**
 * Converte um retorndo da api de correios para a entidade para salvarmos no banco
 * @param {*} trackingInfo Informações de rastreio
 * @param {Boolean} [getDestination=true]  Indicar true se devemos obter a descrição de destino, por padrão true
 * @returns {*} Retorna o obketo criado a partir das informações de rastreio
 */
let trackingInfoToHistory = (trackingInfo, getDestination) => {

    if (getDestination === undefined)
        getDestination = true;

    const _lastEvent = trackingInfo.evento[0];

    let _newHistory = {
        trackingCode: trackingInfo.numero,
        trackingCategory: trackingInfo.categoria,
        lastType: _lastEvent.tipo,
        lastStatus: _lastEvent.status,
        lastDescription: _lastEvent.descricao,
        trackingTime: new Date().toISOString(),
        lastDestination: getDestination ? getTrackingDestination(trackingInfo) : ''
    };

    return _newHistory;
};

let getTrackingDestination = (info) => {
    const _lastEvent = info.evento[0];

    //Se o objeto já estiver entregue, devemos simplesmente ler a cidade e uf
    if (trackingIsFinished(trackingInfoToHistory(info, false)))
        return `${_lastEvent.cidade} - ${_lastEvent.uf}`;

    //Objeto ainda não entregue, então devemos ler a informação da propriedade destino
    const _destination = _lastEvent.destino;

    return `[${_destination.local}] ${_destination.cidade} - ${_destination.uf}`;
};

module.exports = {
    tracakingFinishedList,
    getTrackingIndex,
    trackingIsFinished,
    getTrackingDestination,
    trackingInfoToHistory
};