#!/usr/bin/env node

import { chromium } from 'playwright';
import { saveSong } from '../config/config.js';

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

const checkQuit = async page => {
  ['SIGHUP', 'SIGBREAK', 'SIGTERM', 'SIGINT'].forEach(sig => {
    process.on(sig, async () => {
      console.log(`\nExiting program due to ${sig}...`);
      await page.evaluate(() => options.logout()).finally(process.exit(0));
    });
  });
};

const getSong = async page => {
  const song = await page.$$eval(
    '#qpAnimeName, #qpSongName, #qpSongArtist, #qpSongType',
    elems => elems.map(elem => elem.textContent)
  );
  song.push(
    await page.$eval('#qpSongVideoLink', elem => elem.href),
    new Date().getTime()
  );
  return song;
};

(async () => {
  const browser = await chromium.connectOverCDP({
    endpointURL: 'http://127.0.0.1:4444',
  });
  const context = browser.contexts()[0];
  const page = await detectAMQ(context);
  page.setDefaultTimeout(0);
  await checkQuit(page);

  while (true) {
    await page.waitForSelector('#qpAnimeNameHider', { state: 'visible' });
    await page.waitForSelector('#qpAnimeNameHider', { state: 'hidden' });
    const song = await getSong(page);
    await saveSong(song);
  }
})();
