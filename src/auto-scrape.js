#!/usr/bin/env node

import { chromium } from 'playwright';
import { config, saveSong, readline } from '../config/config.js';

const USERNAME = config.username;
const PASSWORD = config.password;
const SETTINGS = config.settings;

const login = async page => {
  await page.goto('https://animemusicquiz.com/');
  await page.fill('text=Username', USERNAME);
  await page.fill('text=Password', PASSWORD);
  await page.click('#loginButton');
};

const logout = async page => {
  page.evaluate(() => lobby.leave());
  page.evaluate(() => quiz.leave());
  page.keyboard.press('Enter');
  page.evaluate(() => options.logout());
  process.exit(0);
};

const checkQuit = async page => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter quit to exit: ', input => {
    rl.close();
    input = input.trim().toLowerCase();
    if (['quit', 'q', 'close', 'c'].includes(input)) {
      logout(page);
    }
    return checkQuit();
  });
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
  song.push(
    await page.$eval('#qpSongVideoLink', elem => elem.href),
    new Date().getTime()
  );
  return song;
};

(async () => {
  const browser = await chromium.launch({ headles: false });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  page.setDefaultTimeout(40000);

  await login(page);
  checkQuit(page);
  await configureSettings(page);

  while (true) {
    await startGame(page);
    for (let i = 0; i < 100; i++) {
      const song = await getSong(page);
      await saveSong(song);
    }
  }
})();
