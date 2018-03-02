const builder = require('botbuilder');
const carteiroUtils = require('../carteiro-utils');

// const CognitiveServicesCredentials = require('ms-rest-azure').CognitiveServicesCredentials;
// const TextAnalyticsAPIClient = require('azure-cognitiveservices-textanalytics');

/*eslint no-console: ["error", { allow: ["warn","log"] }] */

const options = [
    "Bom",
    "Adorei",
    "Não gostei",
    "Péssimo"
];

//Após a exibição do resultado da busca, devemos perguntar o que ele achou do nosso serviço
module.exports = [
    function (session) {
        const msg = carteiroUtils.formatMessageWithUserName(session, 'Como foi sua experiência ? É importate para eu melhorar meus serviços ;)')
        
        builder.Prompts.choice(session, msg, options, { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.endConversation(`**${results.response.entity}**, muito obrigado pela resposta!`);

        // session.sendTyping();

        // // Creating the Cognitive Services credentials
        // // This requires a key corresponding to the service being used (i.e. text-analytics, etc)
        // if (!process.env.TextAnalyticKey) {

        //     session.endConversation('Obrigado pela resposta ;)');

        //     return;
        // }
        // let _credentials = new CognitiveServicesCredentials(process.env.TextAnalyticKey);

        // //Fazer requisição da análise de sentimento da opnião do serviço
        // let _client = new TextAnalyticsAPIClient(_credentials, 'brazilsouth');
        // let _input = {
        //     documents: [
        //         {
        //             "language": "pt",
        //             "id": "message",
        //             'text': _msg
        //         }
        //     ]
        // };

        // //Validar score da análise e então responder.
        // let _operation = _client.sentiment(_input);
        // _operation.then(function (result) {

        //     let _responseMessage = '';
        //     if (result.errors.length === 0) {
        //         const _sentimentScore = result.documents[0].score;

        //         if (_sentimentScore <= 1 && _sentimentScore > 0.7) {
        //             _responseMessage = "Você é fera!!! Muito obrigado pelo feedback. ;)";
        //         }
        //         else if (_sentimentScore <= 0.7 && _sentimentScore > 0.4) {
        //             _responseMessage = "Foi muito bom te ouvir, estou sempre melhorando !";
        //         }
        //         else {
        //             _responseMessage = "Peço desculpa se não fui últil, estarei melhorando minhas buscas ! :'(";
        //         }
        //     }
        //     else {
        //         _responseMessage = 'Obrigado pela resposta ;)';
        //     }

        //     session.endConversation(_responseMessage);

        // }).catch(function (err) {
        //     console.log(err);
        //     session.endConversation('Obrigado pela resposta ;)');
        // });

    }
];