'use strict';

/*eslint no-console: ["error", { allow: ["warn","log"] }] */

const restify = require('restify');
const builder = require('botbuilder');
const trackingCorreios = require('tracking-correios');

const CognitiveServicesCredentials = require('ms-rest-azure').CognitiveServicesCredentials;
const TextAnalyticsAPIClient = require('azure-cognitiveservices-textanalytics');

// Setup Restify Server
const server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
const connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

const inMemoryStorage = new builder.MemoryBotStorage();

// Um bot que obtém o rastreio de um item no correios
const bot = new builder.UniversalBot(connector, [
    function (session) {
        builder.Prompts.text(session, 'Olá, eu sou Carteiro, posso te ajudar com o rastreio de itens do correios ;) <br /> E qual seu nome ?');
    },
    function (session, results) {
        session.userData.userName = results.response.trim();
        session.beginDialog('askForTrackingCode');
    },
    function (session, results) {
        session.dialogData.trackingCode = results.response.code;
        let _msg = `Aguarde um momento enquanto busco as informações do código ${session.dialogData.trackingCode}`;
        session.send(_msg);

        session.sendTyping();

        trackingCorreios.track(session.dialogData.trackingCode).then((result) => {
            _msg = '';

            if (result === null || result.lenght === 0) {
                _msg = 'Desculpe-me, mas ainda não foram encontradas informações com esse código';
                session.endConversation(_msg);
            }
            else if (result && result[0].erro) {
                _msg = `Desculpe-me, mas não foram encontradas informações do pedido, pois ${result[0].erro.toLocaleLowerCase()}`;
                session.endConversation(_msg);
            }
            else {
                session.beginDialog('trackingInfo', { data: result[0] });
                session.beginDialog('finishingTalk');
            }
        }).catch(() => {
            session.endConversation(`Desculpe-me, não consegui rastrear as informações agora, pois os serviços dos correios está fora.`);
        });
    }
]).set('storage', inMemoryStorage); // Register in-memory storage 

//Perguntar sobre o código de rastreio
bot.dialog('askForTrackingCode', [
    function (session, args) {
        if (args && args.reprompt)
            builder.Prompts.text(session, `${session.userData.userName}, não entendi. Informe o código do rastreio, contém até 13 digitos. Exemplo: AA100833276BR.`);
        else
            builder.Prompts.text(session, `Agora que já nos conhecemo ${session.userData.userName}, me diga qual é o código você gostaria de rastrear ?`);
    },
    function (session, results) {
        const _code = results.response.trim();

        //Verifica se o código passado é válido para requisição
        const _isCodeValid = trackingCorreios.isValid(_code);

        if (_isCodeValid)
            session.endDialogWithResult({ response: { code: _code, category: trackingCorreios.category(_code) } });
        else
            session.replaceDialog('askForTrackingCode', { reprompt: true }); // Repeat the dialog
    }
])
    .endConversationAction(
    "endTrackingCode", "Até o próximo rastreio !",
    {
        matches: /^tchau$|^xau$|^sair&/i
    });

// Diálogo que mostra o resultado da pesquisa
bot.dialog('trackingInfo', function (session, args) {
    const msg = new builder.Message(session);
    const _data = args.data;
    const _lastEvent = _data.evento[0];

    msg.addAttachment(new builder.HeroCard(session)
        .title("Informações do rastreio")
        .subtitle(`Última atualização: ${_lastEvent.data} às ${_lastEvent.hora}`)
        .text(`${_lastEvent.descricao}`));

    // .images([builder.CardImage.create(session, 'http://petersapparel.parseapp.com/img/whiteshirt.png')])
    // .buttons([
    //     builder.CardAction.imBack(session, "buy classic white t-shirt", "Buy")
    // ]));
    session.send(msg).endDialog();
});

bot.dialog('finishingTalk', [
    function (session) {
        builder.Prompts.text(session, `${session.userData.userName}, fui util à você ?`);
    },
    function (session, results) {
        const _msg = results.response;

        session.sendTyping();

        // Creating the Cognitive Services credentials
        // This requires a key corresponding to the service being used (i.e. text-analytics, etc)
        let _credentials = new CognitiveServicesCredentials(process.env.TextAnalyticKey);

        //Fazer requisição da análise de sentimento da opnião do serviço
        let _client = new TextAnalyticsAPIClient(_credentials, 'brazilsouth');
        let _input = {
            documents: [
                {
                    "language": "pt",
                    "id": "message",
                    'text': _msg
                }
            ]
        };

        //Validar score da análise e então responder.
        let _operation = _client.sentiment(_input);
        _operation.then(function (result) {

            let _responseMessage = '';
            if (result.errors.length === 0) {
                const _sentimentScore = result.documents[0].score;

                if (_sentimentScore <= 1 && _sentimentScore > 0.7) {
                    _responseMessage = "Você é fera!!! Muito obrigado pelo feedback. ;)";
                }
                else if (_sentimentScore <= 0.7 && _sentimentScore > 0.4) {
                    _responseMessage = "Foi muito bom te ouvir, estou sempre melhorando !";
                }
                else {
                    _responseMessage = "Peço desculpa se não fui últil, estarei melhorando minhas buscas ! :'(";
                }
            }
            else {
                _responseMessage = 'Obrigado pela resposta ;)';
            }

            session.endConversation(_responseMessage);

        }).catch(function (err) {
            console.log(err);
            session.send('Obrigado pela resposta ;)');
        });

    }
]);