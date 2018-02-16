const builder = require('botbuilder');
const carteiroAPI = require('../carteiro-api');

//Diálogo que reconhece o usuário
module.exports = [
    function (session, args, next) {
        //Adicionar uma nova inscrição de notificação
        carteiroAPI.addNewSubscribe(session.message.address).then((result) => {
            console.log('[recognize-user] Sucesso ao adicionar usuário com notificação');
        }).catch((error) => {
            console.log('[recognize-user] Erro ao adicionar usuário com notificação');
            console.log(error);
        });

        //Verificar usuário
        let _user = session.userData.userName;

        if (_user) {
            session.replaceDialog('instructions');
        }
        else {
            builder.Prompts.text(session, 'Opa, primeiro vamo nos conhecer. Qual seu nome ?');
        }
    },
    function (session, results) {
        session.userData.userName = results.response.trim();
        session.userData.trackingHistory = [];

        session.replaceDialog('instructions');
    }
];