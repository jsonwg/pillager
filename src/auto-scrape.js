#!/usr/bin/env node

import { chromium } from 'playwright';
import { config, saveSong, readline } from '../config/config.js';

const USERNAME = config.username;
const PASSWORD = config.password;
const SETTINGS = config.settings;

const login = async page => {
  await page.goto('https://animemusicquiz.com/');

  if (await page.$('#loadingScreen')) {
    return;
  }

  const regularLogin = async () => {
    await page.fill('text=Username', USERNAME);
    await page.fill('text=Password', PASSWORD);
    await page.click('#loginButton');
    await page.waitForSelector('#loadingScreen');
  };

  const alreadyOnline = async () => {
    await page.waitForSelector('#alreadyOnlineModal[class$="in"]');
    await page.click('#alreadyOnlineContinueButton');
  };

  await Promise.race([
    regularLogin(),
    alreadyOnline(),
    page.click('[href="/?forceLogin=True"]'),
  ]);
};

const logout = async page => {
  await page.evaluate(() => lobby.leave());
  await page.evaluate(() => quiz.leave());
  await page.keyboard.press('Enter');
  await page.evaluate(() => options.logout());
  process.exit(0);
};

const checkQuit = async page => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter quit to exit: ', async input => {
    rl.close();
    input = input.trim().toLowerCase();
    if (['quit', 'q', 'close', 'c'].includes(input)) {
      await logout(page);
    }
    return checkQuit();
  });
};

const checkRejoin = async page => {
  await page.waitForSelector('.swal2-cancel', { state: 'visible' });
  await page.click('.swal2-cancel');
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
  return true;
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

const scraping = async page => {
  const song = await getSong(page);
  await saveSong(song);
};

const inLobby = async page => {
  await page.waitForSelector('#lobbyPage', { state: 'visible' });
  inGame = false;
};

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  await login(page);
  checkQuit(page);
  checkRejoin(page);
  await configureSettings(page);

  while (true) {
    let inGame = await startGame(page);
    while (inGame) {
      await Promise.race([scraping(page), inLobby(page, inGame)]);
    }
  }
})();
