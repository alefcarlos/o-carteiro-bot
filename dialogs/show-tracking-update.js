const builder = require('botbuilder');

//Exibe mensagem dizendo que o item já foi entregue
module.exports = [

    function (session, args, next) {

        var prompt = ('Hello, I\'m the survey dialog. I\'m interrupting your conversation to ask you a question. Type "done" to resume');

        builder.Prompts.choice(session, prompt, "done");

    },

    function (session, results) {

        session.send("Great, back to the original conversation");

        session.endDialog();

    }

]