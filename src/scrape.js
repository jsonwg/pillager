import { chromium } from 'playwright';
import { PythonShell } from 'python-shell';

const detectAMQ = async context => {
  const pages = await context.pages();
  for (const page of pages) {
    if (page.url() == 'https://animemusicquiz.com/') {
      return page;
    }
  }
  const page = await context.newPage();
  await page.goto('https://animemusicquiz.com/');
  return page;
};

const getSong = async page => {
  const song = await page.$$eval(
    '#qpAnimeName, #qpSongName, #qpSongArtist, #qpSongType',
    elems => elems.map(e => e.textContent)
  );
  song.push(await page.$eval('#qpSongVideoLink', e => e.href));
  return song;
};

const saveSong = async song => {
  const opts = { args: [song[0], song[1], song[2], song[3], song[4]] };
  PythonShell.run('write.py', opts, err => {
    if (err) throw err;
  });
};

(async () => {
  const browser = await chromium.connectOverCDP({
    endpointURL: 'http://127.0.0.1:4444',
  });
  const context = browser.contexts()[0];
  const page = await detectAMQ(context);
  page.setDefaultTimeout(0);

  while (page.url() == 'https://animemusicquiz.com/') {
    await page.waitForSelector('#qpAnimeNameHider', { state: 'visible' });
    const song = await getSong(page);
    await saveSong(song);
    await page.waitForSelector('#qpAnimeNameHider', { state: 'hidden' });
  }
})();
