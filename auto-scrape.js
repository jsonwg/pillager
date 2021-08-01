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
  await page.keyboard.press("Enter");
}

(async () => {
  const browser = await puppeteer.connect({
    browserURL: "http://127.0.0.1:4444",
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await login(page);
  await configureSettings(page);
  browser.disconnect();
})();
