'use strict';

/*eslint no-console: ["error", { allow: ["warn","log"] }] */

const restify = require('restify');
const builder = require('botbuilder');
const trackingCorreios = require('tracking-correios');

const CognitiveServicesCredentials = require('ms-rest-azure').CognitiveServicesCredentials;
const TextAnalyticsAPIClient = require('azure-cognitiveservices-textanalytics');
const azure = require('botbuilder-azure');

const logic = require('./carteiro-logic.js');

// Setup Restify Server
const server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Configurações de conexão ao CosmosDB
const documentDbOptions = {
    host: process.env.AzureDocumentDBURI,
    masterKey: process.env.AzureDocumentDBKey,
    database: 'botdocs',
    collection: 'carteirobot-data'
};

// Create chat connector for communicating with the Bot Framework Service
const connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata
});

// Objetos de conexão
const docDbClient = new azure.DocumentDbClient(documentDbOptions);
const cosmosStorage = new azure.AzureBotStorage({ gzipData: false }, docDbClient);

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Se tiver em modo dev, usar in-memory
const inMemoryStorage = new builder.MemoryBotStorage();

// Validar se estamos em modo dev
const usedStorage = (process.env.BotEnv == 'prod') ? cosmosStorage : inMemoryStorage;

// Um bot que obtém o rastreio de um item no correios
const bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send('Olá, eu sou Carteiro, posso te ajudar com o rastreio de itens do correios ;)');
        session.beginDialog('recognizerUser');
    },
    function (session, results) {
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
])
    .endConversationAction(
    "endTrackingCode", "Até o próximo rastreio !",
    {
        matches: /^tchau$|^xau$|^sair$/i
    })
    .set('storage', usedStorage);

bot.dialog('recognizerUser', [
    function (session) {
        //Verificar usuário
        let _user = session.userData.userName;

        if (_user) {
            session.endDialogWithResult({ response: _user });
        }
        else {
            builder.Prompts.text(session, 'E qual seu nome ?');
        }
    },
    function (session, results) {
        session.userData.userName = results.response.trim();
        session.userData.trackingHistory = [];

        session.endDialog();
    }
]);

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

        //Código existe no histórico de pesquisa do usuário
        //e está marcado como entregue, devemos simplesmente informar e não pesquisar na base dos correios
        let _isTrackingFinished = session.userData.trackingHistory.findIndex((element) => {

            return element.trackingCode === _code && logic.tracakingFinishedList.some((seachElement) => {
                return parseInt(seachElement.status) === parseInt(element.lastStatus) && seachElement.type === element.lastType;
            });

        });

        if (_isTrackingFinished >= 0)
            session.replaceDialog('showTrackingFinished', { trackingCode: _code });
        else {
            if (_isCodeValid)
                session.endDialogWithResult({ response: { code: _code, category: trackingCorreios.category(_code) } });
            else
                session.replaceDialog('askForTrackingCode', { reprompt: true }); // Repeat the dialog
        }
    }
]);

bot.dialog('showTrackingFinished', function (session, args) {
    session.send(`De acordo com seu histórico de rastreio, o item ${args.trackingCode} já consta como entregue ;)`);
    session.beginDialog('finishingTalk');
});

// Diálogo que mostra o resultado da pesquisa
bot.dialog('trackingInfo', function (session, args) {
    const msg = new builder.Message(session);
    const _data = args.data;
    const _lastEvent = _data.evento[0];

    //Armazenar informações do rastreio do usuário
    addUserTrackingHistory(session, _data);

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

//Após a exibição do resultado da busca, devemos perguntar o que ele achou do nosso serviço
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

/**
 * Adiciona um registro no histórico do usuário
 * @param {*} session 
 * @param {*} info Informações do rastreio
 */
let addUserTrackingHistory = function (session, info) {
    var _lastEvent = info.evento[0];

    //Verifica se existe já existe o código, então atualizar somente os status
    let _trackingUpdateIndex = session.userData.trackingHistory.findIndex((element) => {
        return element.trackingCode === info.numero;
    });

    if (_trackingUpdateIndex == -1) {

        var _newHistory = {
            trackingCode: info.numero,
            trackingCategory: info.categoria,
            lastType: _lastEvent.tipo,
            lastStatus: _lastEvent.status,
            lastDescription: _lastEvent.descricao,
            trackingTime: new Date().toISOString()
        };

        session.userData.trackingHistory.push(_newHistory);
    }
    else {
        var _entityToUpdate = session.userData.trackingHistory[_trackingUpdateIndex];

        _entityToUpdate.lastType = _lastEvent.tipo;
        _entityToUpdate.lastStatus = _lastEvent.status;
        _entityToUpdate.lastDescription = _lastEvent.descricao;
        _entityToUpdate.trackingTime = new Date().toISOString();
    }
};