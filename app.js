'use strict';

/*eslint no-console: ["error", { allow: ["warn","log"] }] */

const restify = require('restify');
const builder = require('botbuilder');
const azure = require('botbuilder-azure');
const carteiroAPI = require('./carteiro-api');

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
const cosmosStorage = new azure.AzureBotStorage({ gzipData: true }, docDbClient);

// Se tiver em modo dev, usar in-memory
const inMemoryStorage = new builder.MemoryBotStorage();

// Validar se estamos em modo dev
const usedStorage = process.env.BotEnv === 'prod' ? cosmosStorage : inMemoryStorage;

// Um bot que obtém o rastreio de um item no correios
const bot = new builder.UniversalBot(connector)
    .set('storage', usedStorage);

// Make sure you add code to validate these fields
const luisAppId = process.env.LuisAppId;
const luisAPIKey = process.env.LuisAPIKey;
const luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = `https://${luisAPIHostName}/luis/v2.0/apps/${luisAppId}?subscription-key=${luisAPIKey}`;

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Main dialog with LUIS
const recognizer = new builder.LuisRecognizer(LuisModelUrl);
const intents = new builder.IntentDialog({ recognizers: [recognizer] })
    .matches('Greeting', (session) => {
        session.replaceDialog('recognizerUser');
    })
    .matches('Tracking.Find', 'askForTrackingCode')
    .matches('Tracking.History', 'seeTrackingHistory')
    .onDefault((session) => {
        session.send('Desculpe, não entendi sua frase \'%s\'.', session.message.text);
    });

bot.dialog('/', intents);
<<<<<<< HEAD
bot.dialog('instructions', require('./dialogs/instructions'));
bot.dialog('recognizerUser', require('./dialogs/recognizer-user'));
bot.dialog('seeTrackingHistory', require('./dialogs/tracking-history'));
bot.dialog('finishingTalk', require('./dialogs/finish-talking'));
bot.dialog('trackingInfo', require('./dialogs/tracking-info'));
bot.dialog('askForTrackingUpdate', require('./dialogs/ask-for-tracking-update'));
bot.dialog('showTrackingFinished,', require('./dialogs/tracking-is-finished'));
bot.dialog('askForTrackingCode', require('./dialogs/tracking-find.js'));
bot.dialog('showTrackingUpdate', require('./dialogs/show-tracking-update.js'));

bot.on('conversationUpdate', function (update) {

    if (update.membersAdded) {

        update.membersAdded.forEach((identity) => {
            if (identity.id == update.address.bot.id) {
                const reply = new builder.Message()
                    .address(update.address)
                    .text('Olá, eu sou Carteiro, posso te ajudar com o rastreio de itens do correios ;)<br> Diga **Oi**');

                bot.send(reply);
=======

//Diálogo menu principal
bot.dialog('instructions', function (session) {

    const msg = new builder.Message(session)
        .text(`${session.userData.userName}, diga o que você gostaria de fazer, por exemplo: 'rastrear meu item' ou 'ver histórico de pesquisa'. Você pode até me passar o código junto: rastrear AA100833276BR"`)
        .suggestedActions(
            builder.SuggestedActions.create(
                session, [
                    builder.CardAction.imBack(session, "rastrear", "Rastrear"),
                    builder.CardAction.imBack(session, "ver histórico", "Ver histórico")
                ]
            ));
    session.send(msg).endDialog();
});

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
bot.dialog('recognizerUser', [
    function (session, args, next) {

        if (session.userData.userName) {
            session.replaceDialog('instructions');
            return;
        }

        //Verificar usuário do canal
        let _user = geUserNameFromChannel(session);

        if (_user) {
            session.userData.userName = _user;
            session.userData.trackingHistory = [];
        }

        if (session.userData.userName) {
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
]);

//Perguntar sobre o código de rastreio
bot.dialog('askForTrackingCode', [
    function (session, args, next) {
        // Resolve and store any Tracking.Code entity passed from LUIS.
        let _code = builder.EntityRecognizer.findEntity(args.entities, 'Tracking.Code');
        let _trackingCode = _code ? _code.entity.toUpperCase() : '';

        if (!_code) {

            //Se não encontrou via LUIS, então verificar por REGEX
            const rex = (/([A-Z]{2}[0-9]{9}[A-Z]{2}){1}$/);
            const _found = session.message.text.toUpperCase().match(rex);


            if (_found)
                _trackingCode = _found[0].toUpperCase();
        }

        const trackingInfo = session.dialogData.tracking = {
            code: _trackingCode
        };

        // Prompt for tracking code
        if (!trackingInfo.code) {
            if (args && args.reprompt)
                builder.Prompts.text(session, `${session.userData.userName}, não entendi. Informe o código do rastreio, contém até 13 digitos. Exemplo: AA100833276BR.`);
            else
                builder.Prompts.text(session, 'Qual código você gostaria de rastrear?');
        }
        else {
            next();
        }
    },
    function (session, results) {
        //Obter o código de rastreio, se já veio informado  ignorar
        const trackingInfo = session.dialogData.tracking;

        if (results.response) {
            trackingInfo.code = results.response.trim().toUpperCase();
        }

        //Verifica se o código passado é válido para requisição
        const _isCodeValid = /^([A-Z]{2}[0-9]{9}[A-Z]{2}){1}$/.test(trackingInfo.code);

        if (!_isCodeValid) {
            session.replaceDialog('askForTrackingCode', { reprompt: true }); // Repeat the dialog
        } else {

            //Código existe no histórico de pesquisa do usuário e está marcado como entregue, devemos simplesmente informar e não pesquisar na base dos correios
            const _trackingIndex = carteiroUtils.getTrackingIndex(session.userData.trackingHistory, trackingInfo.code);

            if (_trackingIndex >= 0 && carteiroUtils.trackingIsFinished(session.userData.trackingHistory[_trackingIndex])) {
                session.replaceDialog('showTrackingFinished', { trackingCode: trackingInfo.code });
            }
            else {
                requestTracking(session, trackingInfo.code);
            }
        }
    }
]);

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
]);

let buildHistoryList = (session) => {
    const _msg = new builder.Message(session);
    _msg.attachmentLayout(builder.AttachmentLayout.carousel);

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
            card.buttons([builder.CardAction.imBack(session, `rastrear ${_element.trackingCode}`, "Rastrear")]);

        _msg.addAttachment(card);
    }

    return _msg;
};

bot.dialog('showTrackingFinished', function (session, args) {
    session.send(`De acordo com seu histórico de rastreio, o item ${args.trackingCode} já consta como entregue ;)`);
    session.replaceDialog('finishingTalk');
});

// Diálogo que mostra o resultado da pesquisa
bot.dialog('trackingInfo', function (session, args) {
    const msg = new builder.Message(session);
    const _data = args.data;
    const _lastEvent = _data.evento[0];

    //Armazenar informações do rastreio do usuário
    addUserTrackingHistory(session, _data);

    msg.addAttachment(new builder.HeroCard(session)
        .title(`${_lastEvent.descricao}`)
        .subtitle(carteiroUtils.getTrackingDestination(_data))
        .text(`Última atualização: ${_lastEvent.data} às ${_lastEvent.hora}`));

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
        if (!process.env.TextAnalyticKey) {

            session.endConversation('Obrigado pela resposta ;)');
            return;
        }
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
>>>>>>> 0fe29f471498899863e36d51d8ea55f7d3b7e1f2
            }
        });
    }
});

if (process.env.CarteiroAPIUrl) {
    //A cada 1 hora verifica se têm novas notificações
    setInterval(function () {

        carteiroAPI.getTrackings()
            .then((result) => {
                //Lista de usuários que requisitaram ser notificados
                const list = result.data.result;

                if (!list)
                    return;

                list.forEach((user) => {
                    user.trackings.forEach((track) => {
                        bot.beginDialog(user.address, 'showTrackingUpdate', track);
                    });

                    carteiroAPI.setTrackingsSeen()
                        .then(() => { console.log('trackings atualizados com sucesso.'); })
                        .catch((error) => {
                            console.log('Erro ao atualizar os trackings para lido' + error);
                        });
                });
            })
            .catch((error) => {
                console.log('erro ao obter as informações de trackings ' + error);
            })

        carteiroAPI.getNotifications()
            .then((result) => {
                const list = result.data.result;

                if (!list)
                    return;

                list.forEach((message) => {
                    var msg = new builder.Message().address(message.address);
                    msg.text(message.message);
                    bot.send(msg);
                });

                //Setar a mensagens como lidas
                carteiroAPI.setNotificationsRead()
                    .then(() => {
                        console.log('As notificações foram atualizadas com sucesso.');
                    })
                    .catch((error) => {
                        console.log('Erro ao atualizar notificações ' + error);
                    })
            })
            .catch((error) => {
                console.log(error);
            })
    }, 5000); //60000 = 1 minuto
}

// log any bot errors into the console
bot.on('error', function (ex) {
    console.log('And error ocurred', ex);
});