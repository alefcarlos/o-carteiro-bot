'use strict';

/*eslint no-console: ["error", { allow: ["warn","log"] }] */

const restify = require('restify');
const builder = require('botbuilder');
const trackingCorreios = require('tracking-correios');

const CognitiveServicesCredentials = require('ms-rest-azure').CognitiveServicesCredentials;
const TextAnalyticsAPIClient = require('azure-cognitiveservices-textanalytics');
const azure = require('botbuilder-azure');

const carteiroUtils = require('./src/carteiro-utils.js');

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
const usedStorage = process.env.BotEnv === 'prod' ? cosmosStorage : inMemoryStorage;

// Um bot que obtém o rastreio de um item no correios
const bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send('Olá, eu sou Carteiro, posso te ajudar com o rastreio de itens do correios ;)');
        session.beginDialog('recognizerUser');
    },
    function (session, results) {
        const msg = new builder.Message(session)
            .text(`${session.userData.userName}, o que você gostaria de fazer ?`)
            .suggestedActions(
            builder.SuggestedActions.create(
                session, [
                    builder.CardAction.imBack(session, "rastrear", "Rastrear"),
                    builder.CardAction.imBack(session, "ver histórico", "Ver histórico")
                ]
            ));
        session.send(msg);
    }
]).endConversationAction(
    "endTrackingCode", "Até o próximo rastreio !",
    {
        matches: /^tchau$|^xau$|^sair$/i
    })
    .set('storage', usedStorage);

//Diálogo que reconhece o usuário
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
    function (session, args, next) {
        //Verificar se viemos de um rastrear do histórico
        if (session.message.text.indexOf('?trackingCode') > 0) {
            const _code = session.message.text.split('=')[1];
            next({ response: _code });
        }
        else {

            if (args && args.reprompt)
                builder.Prompts.text(session, `${session.userData.userName}, não entendi. Informe o código do rastreio, contém até 13 digitos. Exemplo: AA100833276BR.`);
            else
                builder.Prompts.text(session, `Agora que já nos conhecemo ${session.userData.userName}, me diga qual é o código você gostaria de rastrear ?`);

        }
    },
    function (session, results) {
        const _code = results.response.trim();

        //Verifica se o código passado é válido para requisição
        const _isCodeValid = trackingCorreios.isValid(_code);

        if (!_isCodeValid) {
            session.replaceDialog('askForTrackingCode', { reprompt: true }); // Repeat the dialog

            return;
        }

        //Código existe no histórico de pesquisa do usuário e está marcado como entregue, devemos simplesmente informar e não pesquisar na base dos correios
        const _trackingIndex = carteiroUtils.getTrackingIndex(session.userData.trackingHistory, _code);

        if (_trackingIndex >= 0 && carteiroUtils.trackingIsFinished(session.userData.trackingHistory[_trackingIndex])) {
            session.replaceDialog('showTrackingFinished', { trackingCode: _code });
        }
        else {
            requestTracking(session, _code);
        }
    }
]).triggerAction({
    matches: /^rastrear$|rastrear\?trackingCode=/i
});

//Diálogo para mostrar os itens do histórico do usuário
bot.dialog('seeTrackingHistory', [
    function (session) {
        if (session.userData.trackingHistory.length === 0) {
            const msg = new builder.Message(session)
                .text(`${session.userData.userName}, não encontrei itens para exibir, que tal rastrear agora ?`)
                .suggestedActions(
                builder.SuggestedActions.create(
                    session, [builder.CardAction.imBack(session, "rastrear", "Rastrear")]
                ));
                
            session.send(msg).endConversation();
        }
        else {
            session.send(buildHistoryList(session)).endConversation();
        }
    }
]).triggerAction({
    matches: /^ver histórico$/i
});

let buildHistoryList = (session) => {
    const _msg = new builder.Message(session);

    let _element = null;
    let card = null;

    for (let index = 0; index < session.userData.trackingHistory.length; index++) {
        _element = session.userData.trackingHistory[index];
        card = new builder.HeroCard(session)
            .title(`Informações do rastreio ${_element.trackingCode}`)
            //.subtitle(`Última atualização: ${_lastEvent.data} às ${_lastEvent.hora}`)
            .text(`${_element.lastDescription}`);

        //Senão estiver finalizado, adicionar botão para rastreio
        if (!carteiroUtils.trackingIsFinished(_element))
            card.buttons([builder.CardAction.imBack(session, `rastrear?trackingCode=${_element.trackingCode}`, "Rastrear")]);

        _msg.addAttachment(card);
    }

    return _msg;
};

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
 * Cra um novo registros de histórico
 * @param {*} trackingInfo Informações de rastreio
 * @returns {*} Retorna o obketo criado a partir das informações de rastreio
 */
let createNewHistory = (trackingInfo) => {

    const _lastEvent = trackingInfo.evento[0];

    let _newHistory = {
        trackingCode: trackingInfo.numero,
        trackingCategory: trackingInfo.categoria,
        lastType: _lastEvent.tipo,
        lastStatus: _lastEvent.status,
        lastDescription: _lastEvent.descricao,
        trackingTime: new Date().toISOString()
    };

    return _newHistory;
};

/**
 * Adiciona um registro no histórico do usuário
 * @param {*} session Session
 * @param {*} info Informações do rastreio
 * @returns {Boolean} Retorna true quando tudo finalizado.
 */
let addUserTrackingHistory = function (session, info) {
    const _lastEvent = info.evento[0];

    //Verifica se existe já existe o código, então atualizar somente os status
    let _trackingUpdateIndex = carteiroUtils.getTrackingIndex(session.userData.trackingHistory, info.numero);

    if (_trackingUpdateIndex === -1) {
        session.userData.trackingHistory.push(createNewHistory(info));
    }
    else {
        let _entityToUpdate = session.userData.trackingHistory[_trackingUpdateIndex];

        _entityToUpdate.lastType = _lastEvent.tipo;
        _entityToUpdate.lastStatus = _lastEvent.status;
        _entityToUpdate.lastDescription = _lastEvent.descricao;
        _entityToUpdate.trackingTime = new Date().toISOString();
    }

    return true;
};

let requestTracking = (session, trackingCode) => {
    let _msg = `Aguarde um momento enquanto busco as informações do código ${trackingCode}`;
    session.send(_msg);

    session.sendTyping();
    trackingCorreios.track(trackingCode).then((result) => {
        _msg = '';

        if (result === null || result.lenght === 0) {
            session.send('Desculpe-me, mas ainda não foram encontradas informações com esse código');
        }
        else if (result && result[0].erro) {
            session.send(`Desculpe-me, mas não foram encontradas informações do pedido. O item pode ter sido recém postado.`);
        }
        else {
            session.beginDialog('trackingInfo', { data: result[0] });

        }

        session.beginDialog('finishingTalk');
    }).catch(() => {
        session.endConversation(`Desculpe-me, não consegui rastrear as informações agora, pois os serviços dos correios está fora.`);
    });
};