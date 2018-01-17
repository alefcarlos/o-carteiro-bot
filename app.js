var restify = require('restify');
var builder = require('botbuilder');
var trackingCorreios = require('tracking-correios');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

var inMemoryStorage = new builder.MemoryBotStorage();

// Um bot que obtém o rastreio de um item no correios
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send('Oi, eu sou O Carteiro, vou te ajudar com o rastreio de itens do correios ;)');
        session.beginDialog('askForTrackingCode');
    },
    function (session, results) {
        session.dialogData.trackingCode = results.response.code;
        var _msg = `A categoria da sua encomenda é ${results.response.category}, aguarde um momento enquanto busco as informações...`;
        session.say(_msg);

        session.sendTyping();

        trackingCorreios.track(session.dialogData.trackingCode).then((result) => {
            var msg = '';

            if (result === null || result.lenght === 0)
                msg = 'Desculpe-me, mas ainda não foram encontradas informações com esse código';
            else if (result && result[0].erro)
                msg = `Desculpe-me, mas não foram encontradas informações do pedido, pois ${result[0].erro.toLocaleLowerCase()}`;
            else {
                var _evento = result[0].evento[0];
                msg = `Obtive as informações com sucesso, a última atualização é ${_evento.descricao}`;
            }

            session.endConversation(msg);
        }).catch((err) => {
            session.endConversation(`Desculpe-me, não consegui rastrear as informações agora, pois os serviços dos correios está fora.`);
        });
    }
]).set('storage', inMemoryStorage); // Register in-memory storage 

//Perguntar sobre o código de rastreio
bot.dialog('askForTrackingCode', [
    function (session, args) {
        if (args && args.reprompt)
            builder.Prompts.text(session, "Informe o código do rastreio, contém até 13 digitos. Exemplo: AA100833276BR.");
        else
            builder.Prompts.text(session, "Qual é o código de rastreio ?");
    },
    function (session, results) {
        var _code = results.response.trim();

        //Verifica se o código passado é válido para requisição
        var _isCodeValid = trackingCorreios.isValid(_code);

        if (_isCodeValid)
            session.endDialogWithResult({ response: { code: _code, category: trackingCorreios.category(_code) } });
        else
            session.replaceDialog('askForTrackingCode', { reprompt: true }); // Repeat the dialog
    }
])
    .endConversationAction(
    "endTrackingCode", "Opa, é nois.",
    {
        matches: /^tchau$|^xau$/i
    });

// Context Help dialog for party size
// bot.dialog('trackingCodeHelp', function (session, args, next) {
//     var msg = "Código do rastreio de até 13 digitos.";
//     session.endDialog(msg);
// });