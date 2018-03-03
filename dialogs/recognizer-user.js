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
module.exports = function (session, args, next) {
    console.log("[docs/instructions.js]Iniciando diálogo: recognizer-user");
    console.log(`Ambiente do bot ${process.env.BotEnv}`);

    console.log("[docs/recognizer-user]Tentando reconhecer o usuário..")
    console.log(`[docs/recognizer-user]CarteiroAPI está ativado ? ${process.env.CarteiroAPIUrl != undefined}`)

    if (process.env.CarteiroAPIUrl) {
        //Adicionar uma nova inscrição de notificação
        carteiroAPI.addNewSubscribe(session.message.address).then((result) => {
            console.log('[recognize-user] Sucesso ao adicionar usuário com notificação');
        }).catch((error) => {
            console.log('[recognize-user] Erro ao adicionar usuário com notificação');
            console.log(error);
        });
    }

    if (session.userData.trackingHistory != undefined) {
        session.replaceDialog('instructions');
        return;
    }

    _user = geUserNameFromChannel(session);

    console.log(`[docs/recognizer-user]Nome do usuário: ${_user}`);

    session.userData.userName = _user;
    session.userData.trackingHistory = [];
    session.replaceDialog('instructions');
};