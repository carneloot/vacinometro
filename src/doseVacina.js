const puppeteer = require('puppeteer');

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */

exports.doseVacina = async (event, context) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    console.log('Carregando a página...');
    await page.goto(process.env.URL);

    await page.evaluate((cpf) => {
        document.querySelector('#login').value = cpf;
        document.querySelector('#declaracaoLGPD').checked = true;
    }, process.env.CPF);

    console.log('Clicando o botão...');
    await page.click('input[type="submit"]');

    await page.waitForSelector('table.calendar#planilha');

    const resultPage = await page.content()

    const dataPrimeiraDose = resultPage.match(/Data da 1ª DOSE: <b>(\d{2}\/\d{2}\/\d{4})?<\/b>/)[1] ?? ''
    const dataSegundaDose = resultPage.match(/Data da 2ª DOSE: <b>(\d{2}\/\d{2}\/\d{4})?<\/b>/)[1] ?? ''

    const saiuDatas = dataPrimeiraDose || dataSegundaDose;

    if (saiuDatas) {
        console.log('Encontrei datas!', dataPrimeiraDose, dataSegundaDose);

        const { SENDGRID_API_KEY, EMAIL } = process.env;

        if (SENDGRID_API_KEY && EMAIL) {
            const { default: sendgrid } = await import('@sendgrid/mail');
    
            sendgrid.setApiKey(SENDGRID_API_KEY);
;
            const screenshot = await page.screenshot({ fullPage: true });

            await sendgridsend({
                to: EMAIL,
                from: EMAIL,
                subject: '[URGENTE] Dose Vacina',
                html: `<h2>Saiu dose da vacina!!!</h2>
                <br>1ª Dose:<strong>${dataPrimeiraDose}</strong>
                <br>2ª Dose:<strong>${dataSegundaDose}</strong>
                <br><img src="cid:print"/>
                `,
                attachments: [{
                    content: screenshot.toString('base64'),
                    type: 'image/png',
                    contentId: 'print',
                    filename: 'print.png'
                }],
            });
        }

    } else {
        console.log('Nao encontrei datas :(');
    }

    await page.close();
    await browser.close();
};
