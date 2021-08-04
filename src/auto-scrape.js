import { chromium } from 'playwright';
import { PythonShell } from 'python-shell';

const USERNAME = process.env.AMQUSER;
const PASSWORD = process.env.AMQPASS;
const SETTINGS =
  '6082s1111111132s000011110000002s1111005051o1100k012r02i0a46511002s0111110111002s0111002s01a111111111102a1111111111i01k503-11111--';

const login = async page => {
  await page.goto('https://animemusicquiz.com/');
  await page.fill('text=Username', USERNAME);
  await page.fill('text=Password', PASSWORD);
  await page.click('#loginButton');
};

const configureSettings = async page => {
  await page.click('text=PlaySolo');
  await page.click('#mhLoadSettingButton >> text=Load');
  await page.click('text=Load from Code');
  await page.fill('[placeholder="Setting Code"]', SETTINGS);
  await page.press('[aria-label=""]', 'Enter');
  await page.evaluate(() => roomBrowser.host());
};

const startGame = async page => {
  await page.click('#lbStartButton');
  await page.waitForSelector('#qpHiderText >> text=/^(?!Loading).*$/');
};

const getSong = async page => {
  await page.waitForSelector('#qpAnimeNameHider', { state: 'visible' });
  await page.evaluate(() => quiz.skipClicked());
  await page.waitForSelector('#qpAnimeNameHider', { state: 'hidden' });
  await page.evaluate(() => quiz.skipClicked());

  const song = await page.$$eval(
    '#qpAnimeName, #qpSongName, #qpSongArtist, #qpSongType',
    elems => elems.map(elem => elem.textContent)
  );
  song.push(await page.$eval('#qpSongVideoLink', elem => elem.href));
  return song;
};

const saveSong = async song => {
  const opts = { args: [song[0], song[1], song[2], song[3], song[4]] };
  PythonShell.run('src/write.py', opts, err => {
    if (err) throw err;
  });
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  page.setDefaultTimeout(40000);

  await login(page);
  await configureSettings(page);

  while (page.url() == 'https://animemusicquiz.com/') {
    await startGame(page);
    for (let i = 0; i < 100; i++) {
      const song = await getSong(page);
      await saveSong(song);
    }
  }
})();
