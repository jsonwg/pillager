import puppeteer from "puppeteer";
import { PythonShell } from "python-shell";

const USERNAME = process.env.AMQUSER;
const PASSWORD = process.env.AMQPASS;
const SETTINGS = process.env.AMQSET;

async function login(page) {
  await page.goto("http://animemusicquiz.com");
  await page.type("#loginUsername", USERNAME);
  await page.type("#loginPassword", PASSWORD);
  await page.click("#loginButton");
}

async function configureSettings(page) {
  await page.waitForXPath(
    "//*[@id='loadingScreen' and @class='gamePage hidden']"
  );
  await page.evaluate(() => hostModal.displayHostSolo());
  await page.evaluate(() => hostModal.toggleLoadContainer());
  await new Promise((_) => setTimeout(_, 800));

  await page.click("#mhLoadFromSaveCodeButton");
  await page.type(".swal2-input", SETTINGS);
  await new Promise((_) => setTimeout(_, 1000));
  await page.keyboard.press("Enter");

  await page.evaluate(() => roomBrowser.host());
}

async function startGame(page) {
  await page.waitForXPath("//*[@id='lobbyPage' and @class='text-center']");
  await page.evaluate(() => lobby.fireMainButtonEvent());
  await page.waitForXPath(
    "//*[@id='qpHiderText' and not(contains(., 'Loading'))]"
  );
}

async function getSong(page) {
  await page.waitForXPath(
    "//*[@id='qpAnimeNameHider' and not(contains(@class, 'hide'))]"
  );
  await page.evaluate(() => quiz.skipClicked());
  await page.waitForXPath(
    "//*[@id='qpAnimeNameHider' and contains(@class, 'hide')]"
  );
  await page.evaluate(() => quiz.skipClicked());

  const song = await page.$$eval(
    "#qpAnimeName, #qpSongName, #qpSongArtist, #qpSongType",
    (elems) => elems.map((e) => e.textContent)
  );
  song.push(await page.$eval("#qpSongVideoLink", (e) => e.href));
  return song;
}

async function saveSong(song) {
  const opts = { args: [song[0], song[1], song[2], song[3], song[4]] };
  PythonShell.run("write.py", opts, (err) => {
    if (err) throw err;
  });
}

(async () => {
  const browser = await puppeteer.launch({ defaultViewport: null });
  const page = await browser.newPage();

  await login(page);
  await configureSettings(page);

  while (page.url() == "https://animemusicquiz.com/") {
    await startGame(page);
    for (let i = 0; i < 100; i++) {
      const song = await getSong(page);
      await saveSong(song);
    }
  }
})();
