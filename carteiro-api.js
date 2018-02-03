const axios = require('axios');

/*eslint no-console: ["error", { allow: ["warn","log","error"] }] */

let addNewSubscribe = (address) => {
    axios.post('http://localhost:3000/subscribe', {
        code: 'alefteste',
        address: address
    })
        .then(function (response) {
            console.log(response);
        })
        .catch(function (error) {
            console.log(error.response.message);
        });
};

module.exports = {
    addNewSubscribe
};