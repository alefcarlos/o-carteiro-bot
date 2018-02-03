'use strict';

/*eslint no-console: ["error", { allow: ["warn","log"] }] */

const restify = require('restify');
const builder = require('botbuilder');
const azure = require('botbuilder-azure');

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
        session.send('Olá, eu sou Carteiro, posso te ajudar com o rastreio de itens do correios ;)');
        session.replaceDialog('recognizerUser');
    })
    .matches('Tracking.Find', 'askForTrackingCode')
    .matches('Tracking.History', 'seeTrackingHistory')
    .onDefault((session) => {
        session.send('Desculpe, não entendi sua frase \'%s\'.', session.message.text);
    });

bot.dialog('/', intents);
bot.dialog('instructions', require('./dialogs/instructions'));
bot.dialog('recognizerUser', require('./dialogs/recognizer-user'));
bot.dialog('seeTrackingHistory', require('./dialogs/tracking-history'));
bot.dialog('finishingTalk', require('./dialogs/finish-talking'));
bot.dialog('trackingInfo', require('./dialogs/tracking-info'));
bot.dialog('showTrackingFinished,', require('./dialogs/tracking-is-finished'));
bot.dialog('askForTrackingCode', require('./dialogs/tracking-find.js'));

// Every 5 seconds, check for new registered users and start a new dialog
// setInterval(function () {
//     var newAddresses = userStore.splice(0);
//     newAddresses.forEach(function (address) {

//         console.log('Starting survey for address:', address);

//         // new conversation address, copy without conversationId
//         var newConversationAddress = Object.assign({}, address);
//         delete newConversationAddress.conversation;

//         // start survey dialog
//         bot.beginDialog(newConversationAddress, 'survey', null, function (err) {
//             if (err) {
//                 // error ocurred while starting new conversation. Channel not supported?
//                 bot.send(new builder.Message()
//                     .text('This channel does not support this operation: ' + err.message)
//                     .address(address));
//             }
//         });

//     });
// }, 5000);

// log any bot errors into the console
bot.on('error', function (ex) {
    console.log('And error ocurred', ex);
});