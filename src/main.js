require('dotenv/config');

const { doseVacina } = require('./doseVacina');

(async () => {
    await doseVacina(null, null);
})()

