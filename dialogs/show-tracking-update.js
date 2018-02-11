const builder = require('botbuilder');
const carteiroAPI = require('../carteiro-api');

//Exibe mensagem dizendo que o item já foi entregue
module.exports = function (session, args) {
    session.send("Nova notificação");

    carteiroAPI.setSeen(args.id)
        .then(() => { })
        .catch((error) => {
            console.log(error.message);
        });
}