import puppeteer from 'puppeteer';
import 'dotenv/config';

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

const dataPrimeiraDose = resultPage.match(/Data da 1ª DOSE: <b>(.*)<\/b><br>D/)[1]
const dataSegundaDose = resultPage.match(/Data da 2ª DOSE: <b>(.*)<\/b><br><br>D/)[1]

const saiuDatas = dataPrimeiraDose || dataSegundaDose;

if (saiuDatas) {
  console.log('Encontrei datas!');
  const { default: sendgrid } = await import('@sendgrid/mail');

  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

  const email = process.env.EMAIL;

  const screenshot = await page.screenshot({ fullPage: true });

  await sendgrid.send({
    to: email,
    from: email,
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
  })
} else {
  console.log('Nao encontrei datas :(');
}

await page.close();
await browser.close();
