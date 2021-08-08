#!/usr/bin/env node

import { chromium } from 'playwright';
import { config, saveSong } from '../config/config.js';

const USERNAME = config.username;
const PASSWORD = config.password;
const SETTINGS = config.settings;
const EXCLUSIONS = ['image', 'font', 'other'];

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

const routeRequests = async page => {
  await page.route('**/*', route => {
    const isDupeSong =
      route.request().url().includes('webm') &&
      !route.request().url().includes('moeVideo') &&
      !route.request().redirectedFrom();

    return EXCLUSIONS.includes(route.request().resourceType()) || isDupeSong
      ? route.abort()
      : route.continue();
  });
};

const checkQuit = async page => {
  ['SIGHUP', 'SIGBREAK', 'SIGTERM', 'SIGINT'].forEach(sig => {
    process.on(sig, async () => {
      console.log(`\nExiting program due to ${sig}...`);
      await page.evaluate(() => options.logout()).finally(process.exit(0));
    });
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
  await page.waitForSelector('#lobbyPage');
  await page.evaluate(() => lobby.fireMainButtonEvent());
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
  return true;
};

const checkForLobby = async page => {
  await page.waitForSelector('#lobbyPage', { timeout: 60000 });
  return false;
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  await routeRequests(page);

  await checkQuit(page);
  await login(page);
  checkRejoin(page);
  await configureSettings(page);

  while (true) {
    let inGame = await startGame(page);
    while (inGame) {
      inGame = await Promise.race([scraping(page), checkForLobby(page)]);
    }
  }
})();
