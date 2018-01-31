const builder = require('botbuilder');

//Diálogo que reconhece o usuário
module.exports = [
    function (session, args, next) {
        //Verificar usuário
        let _user = session.userData.userName;

        if (_user) {
            session.replaceDialog('instructions');
        }
        else {
            builder.Prompts.text(session, 'Qual seu nome ?');
        }
    },
    function (session, results) {
        session.userData.userName = results.response.trim();
        session.userData.trackingHistory = [];

        session.replaceDialog('instructions');
    }
]