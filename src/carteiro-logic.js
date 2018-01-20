'use strict'

/**
 * Lista de status que definem se o código
 * já foi entregue ao cliente
 */
const tracakingFinishedList = [{
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
}];


module.exports = {
    tracakingFinishedList
};