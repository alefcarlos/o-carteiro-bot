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

    //Objeto não está entregue, mas não tem destino(pode acontecer com compras internacionais)
    if (!_lastEvent.destino)
        return `${_lastEvent.cidade} - ${_lastEvent.uf}`;

    //Objeto ainda não entregue, então devemos ler a informação da propriedade destino
    const _destination = _lastEvent.destino;

    if (_destination.cidade)
        return `[${_destination.local}] ${_destination.cidade} - ${_destination.uf}`;

    return `[${_destination.local}] - ${_destination.uf}`;
};

/**
 * Retorna o nome do usuário, somente para Skype e Facebook, senão retorna vazio
 * @param {*} session Informações da sessão do chat
 */
let getUserName = (session) => {
    if (session.userData.userName)
        return session.userData.userName;

    return "";
}

/**
 * Retorna uma mensagem concatenado com o nome do usuário(Facebook e skype) no ínicio
 * @param {*} session Informações da sessão do chat
 * @param {string} message Mensagem a ser formatada
 */
let formatMessageWithUserName = (session, message) => {
    const _userName = getUserName(session);
    
    return (_userName) ? `${_userName}, ${message}` : message;
};

module.exports = {
    tracakingFinishedList,
    getTrackingIndex,
    trackingIsFinished,
    getTrackingDestination,
    trackingInfoToHistory,
    getUserName,
    formatMessageWithUserName
};