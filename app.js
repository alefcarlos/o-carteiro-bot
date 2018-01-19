var restify = require('restify');
var builder = require('botbuilder');
var trackingCorreios = require('tracking-correios');
var axios = require('axios');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

var inMemoryStorage = new builder.MemoryBotStorage();

// Um bot que obtém o rastreio de um item no correios
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send('Olá, eu sou Carteiro, posso te ajudar com o rastreio de itens do correios ;)');
        session.beginDialog('askForTrackingCode');
    },
    function (session, results) {
        session.dialogData.trackingCode = results.response.code;
        var _msg = `Aguarde um momento enquanto busco as informações do código ${session.dialogData.trackingCode}`;
        session.send(_msg);

        session.sendTyping();

        trackingCorreios.track(session.dialogData.trackingCode).then((result) => {
            var msg = '';

            if (result === null || result.lenght === 0) {
                msg = 'Desculpe-me, mas ainda não foram encontradas informações com esse código';
                session.endConversation(msg);
            }
            else if (result && result[0].erro) {
                msg = `Desculpe-me, mas não foram encontradas informações do pedido, pois ${result[0].erro.toLocaleLowerCase()}`;
                session.endConversation(msg);
            }
            else {
                session.beginDialog('trackingInfo', { data: result[0] });
                session.beginDialog('finishingTalk');
            }
        }).catch((err) => {
            session.endConversation(`Desculpe-me, não consegui rastrear as informações agora, pois os serviços dos correios está fora.`);
        });
    }
]).set('storage', inMemoryStorage); // Register in-memory storage 

//Perguntar sobre o código de rastreio
bot.dialog('askForTrackingCode', [
    function (session, args) {
        // doSentimentAnalysis('alef');
        if (args && args.reprompt)
            builder.Prompts.text(session, "Desculpe, não entendi. Informe o código do rastreio, contém até 13 digitos. Exemplo: AA100833276BR.");
        else
            builder.Prompts.text(session, "Me diga qual é o código de rastreio ?");
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
        matches: /^tchau$|^xau$|^sair&/i
    });

// Diálogo que mostra o resultado da pesquisa
bot.dialog('trackingInfo', function (session, args) {
    var msg = new builder.Message(session);
    var _data = args.data;
    var _lastEvent = _data.evento[0];

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
        builder.Prompts.text(session, "Agora me diga, fui util à você ?");
    },
    function (session, results) {
        var _msg = results.response;

        doSentimentAnalysis(session, _msg, () => {
            session.endConversation();
        });
    }
]);

//Método que verifica o sentimento da pessoa através da mensagem
//TODO: Fazer esse metodo ser parte do dilogo ou promise
var doSentimentAnalysis = (session, message, callback) => {
    var _url = process.env.TextAnalyticsUrl;

    if (!_url) {
        session.send('Obrigado pela resposta ;)');
        callback();
    } else {

        session.sendTyping();
        axios.post(process.env.TextAnalyticsUrl, {
            "documents": [
                {
                    "language": "pt",
                    "id": "message",
                    "text": message
                }
            ]
        }, {
                headers: { 'Ocp-Apim-Subscription-Key': process.env.TextAnalyticKey }
            })
            .then((response) => {
                var _result = response.data;

                if (_result.errors.length === 0) {
                    var _sentimentScore = _result.documents[0].score;
                    var _responseMessage = '';
                    if (_sentimentScore <= 1 && _sentimentScore > 0.7) {
                        responseMessage = "Você é fera!!! Muito obrigado pelo feedback. *-*";
                    }
                    else if (_sentimentScore <= 0.7 && _sentimentScore > 0.4) {
                        _responseMessage = "Foi muito bom te ouvir, estou sempre melhorando !";
                    }
                    else {
                        _responseMessage = "Peço desculpa se não fui últil, estarei melhorando minhas buscas ! :'(";
                    }

                    session.send(_responseMessage);
                }
                else {
                    session.send('Obrigado pela resposta ;)');
                }

                callback();
            })
            .catch(() => {
                session.send('Obrigado pela resposta ;)');
                callback();
            });
    }
};