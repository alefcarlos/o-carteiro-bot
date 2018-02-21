const builder = require('botbuilder');
const carteiroAPI = require('../carteiro-api');

/**
 * Se o canal for facebook ou skype com usuario logado
 * obtemos o nome a partir do canal
 * @param {*} session Informações da sessão
 * @returns {string} String vazio ou nome do usuário
 */
let geUserNameFromChannel = (session) => {
    const available = ['facebook', 'skype'];
    const channel = session.message.address.channelId;

    const exist = available.findIndex((value) => {
        return value == channel;
    })

    if (exist == -1)
        return '';

    const user = session.message.address.user;

    if (user.name == undefined)
        return '';

    return user.name;
}

//Diálogo que reconhece o usuário
module.exports = [
    function (session, args, next) {

        if (process.env.CarteiroAPIUrl) {
            //Adicionar uma nova inscrição de notificação
            carteiroAPI.addNewSubscribe(session.message.address).then((result) => {
                console.log('[recognize-user] Sucesso ao adicionar usuário com notificação');
            }).catch((error) => {
                console.log('[recognize-user] Erro ao adicionar usuário com notificação');
                console.log(error);
            });
        }

        //Verificar usuário
        let _user = session.userData.userName;

        if (_user) {
            session.replaceDialog('instructions');
            return;
        }

        _user = geUserNameFromChannel(session);

        if (_user) {
            session.userData.userName = _user;
            session.userData.trackingHistory = [];
            return;
        }

        builder.Prompts.text(session, 'Opa, primeiro vamo nos conhecer. Qual seu nome ?');
    },
    function (session, results) {
        session.userData.userName = results.response.trim();
        session.userData.trackingHistory = [];

        session.replaceDialog('instructions');
    }
];