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
const bot = new builder.UniversalBot(connector, require('./dialogs/recognizer-user'))
    .set('storage', usedStorage);

// Make sure you add code to validate these fields
const luisAppId = process.env.LuisAppId;
const luisAPIKey = process.env.LuisAPIKey;
const luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = `https://${luisAPIHostName}/luis/v2.0/apps/${luisAppId}?subscription-key=${luisAPIKey}`;

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Main dialog with LUIS
// const recognizer = new builder.LuisRecognizer(LuisModelUrl);
// const intents = new builder.IntentDialog({ recognizers: [recognizer] })
//     .matches('Greeting', (session) => {
//         session.replaceDialog('recognizerUser');
//     })
//     .matches('Tracking.Find', 'askForTrackingCode')
//     .matches('Tracking.History', 'seeTrackingHistory')
//     .onDefault((session) => {
//         session.send('Desculpe, não entendi sua frase \'%s\'.', session.message.text);
//     });

// bot.dialog('/', intents);

bot.dialog('instructions', require('./dialogs/instructions'));
// bot.dialog('recognizerUser', require('./dialogs/recognizer-user'));
bot.dialog('seeTrackingHistory', require('./dialogs/tracking-history'))
.triggerAction({
    matches: /histórico/i
});
bot.dialog('finishingTalk', require('./dialogs/finish-talking'));
bot.dialog('trackingInfo', require('./dialogs/tracking-info'));
bot.dialog('askForTrackingUpdate', require('./dialogs/ask-for-tracking-update'));
bot.dialog('askForTrackingCode', require('./dialogs/tracking-find.js'))
    .triggerAction({
        matches: /^rastrear/i
    });;
bot.dialog('showTrackingIsFinished,', require('./dialogs/tracking-is-finished'));
bot.dialog('showTrackingUpdate', require('./dialogs/show-tracking-update.js'));

// bot.on('conversationUpdate', function (update) {
//     console.log("[docs/app.js]On: conversationUpdate");

//     if (update.membersAdded) {
//         console.log("[docs/app.js]On: update.membersAdded");

//         update.membersAdded.forEach((identity) => {
//             console.log("[docs/app.js]On: forEach");

//             if (identity.id != update.address.bot.id) {
//                 console.log("[docs/app.js]On: bot entrou, enviando mensagem");
//                 console.log(`[docs/app.js]On: update.address ${JSON.stringify(update.address)}`);

//                 const reply = new builder.Message()
//                     .address(update.address)
//                     .text('Olá, eu sou Carteiro, posso te ajudar com o rastreio de itens do correios ;)<br> Diga **Oi**');

//                 bot.send(reply);

//                 console.log("[docs/app.js]On: bot entrou, mensagem enviada.");
//             }
//         });
//     }
// });

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
    console.log("[docs/app.js]On: error");

    console.log('And error ocurred', ex);
});