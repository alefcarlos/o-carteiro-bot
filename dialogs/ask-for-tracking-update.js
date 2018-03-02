const builder = require('botbuilder');
const carteiroAPI = require('../carteiro-api');

const options = [
    'Sim',
    'Não'
];

//Exibe mensagem dizendo que o item já foi entregue
module.exports = [
    function (session, args) {
        const msg = carteiroUtils.formatMessageWithUserName(session, 'A encomenda ainda foi entregue, gostaria de ser informado **automáticamente** sobre atualizações ?');
        builder.Prompts.choice(session, _msg, options, { listStyle: builder.ListStyle.button });
    },
    (session, results) => {
        const _choice = results.response.entity;

        if (_choice === 'Sim') {
            const _code = session.conversationData.tracking.code;

            session.send(`Um momento enquanto salvo o número de rastreio **${_code}**...`);
            session.sendTyping();

            carteiroAPI.addNewTracking(_code, session.message.address).then((result) => {
                session.endConversation('Ok, você será notifiacdo nas próximas atualizações ;)');
                session.replaceDialog('finishingTalk'); //Devemos finalizar

            }).catch((error) => {
                if (error.response)
                    session.endConversation(carteiroUtils.formatMessageWithUserName(session, `Houve um problema ao salvar notificação: ${error.response.data.message}`));
                else
                    session.endConversation(carteiroUtils.formatMessageWithUserName(session, 'houve um problema ao salvar notificação. Tente novamente mais tarde.'));

                console.log(error);
                session.replaceDialog('finishingTalk'); //Devemos finalizar
            });
        }
        else {
            session.send('Tudo bem, mas você pode voltar e rastrear novamente ;)');
            session.replaceDialog('finishingTalk'); //Devemos finalizar
        }
    }
];