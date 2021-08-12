#!/usr/bin/env node

import { chromium, errors } from 'playwright';
import { config, saveSong } from '../config/config.js';

const USERNAME = config.username;
const PASSWORD = config.password;
const SETTINGS = config.settings;
const EXCLUSIONS = ['image', 'font', 'other'];

async function login(page) {
  await page.goto('https://animemusicquiz.com/');

  if (await page.$('#loadingScreen')) {
    return;
  }

  try {
    await page.fill('text=Username', USERNAME);
    await page.fill('text=Password', PASSWORD);
    await page.click('#loginButton');
    await page.waitForSelector('#loadingScreen', { timeout: 15000 });
  } catch (e) {
    if (e instanceof errors.TimeoutError) {
      await page.click('#alreadyOnlineContinueButton');
    } else {
      throw e;
    }
  }
}

async function routeRequests(page) {
  await page.route('**/*', route => {
    const isDupeSong =
      process.argv.length == 3
        ? route.request().url().includes('webm') &&
          !route.request().url().includes('moeVideo') &&
          !route.request().redirectedFrom()
        : null;

    return EXCLUSIONS.includes(route.request().resourceType()) || isDupeSong
      ? route.abort()
      : route.continue();
  });
}

async function checkQuit(page) {
  ['SIGHUP', 'SIGBREAK', 'SIGTERM', 'SIGINT'].forEach(sig => {
    process.on(sig, async () => {
      console.log(`\nExiting program due to ${sig}...`);
      await page.evaluate(() => options.logout()).finally(process.exit(0));
    });
  });
}

async function configureSettings(page) {
  try {
    await page.click('.swal2-cancel', { timeout: 15000 });
  } catch (e) {
    if (e instanceof errors.TimeoutError) {
      // No prompt was given to rejoin
    } else {
      throw e;
    }
  }

  await page.click('text=PlaySolo');
  await page.click('#mhLoadSettingButton >> text=Load');
  await page.click('text=Load from Code');
  await page.fill('[placeholder="Setting Code"]', SETTINGS);
  await page.press('[aria-label=""]', 'Enter');
  await page.evaluate(() => roomBrowser.host());
}

async function startGame(page) {
  await page.click('#lbStartButton');
  await page.waitForSelector('#qpHiderText >> text=/^(?!Loading).*$/');
}

async function getSong(page) {
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
}

async function inGame(page) {
  async function scraping(page) {
    try {
      const song = await getSong(page);
      await saveSong(song);
      return scraping(page);
    } catch (e) {
      if (e instanceof errors.TimeoutError) {
        return;
      } else {
        throw e;
      }
    }
  }
  return await scraping(page);
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  await routeRequests(page);

  await checkQuit(page);
  await login(page);
  await configureSettings(page);

  while (true) {
    await startGame(page);
    await inGame(page);
  }
})();
