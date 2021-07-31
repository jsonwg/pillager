import puppeteer from "puppeteer";
import { PythonShell } from "python-shell";

const USERNAME = process.env.AMQUSER;
const PASSWORD = process.env.AMQPASS;

async function login(page) {
  await page.goto("http://animemusicquiz.com");
  await page.type("#loginUsername", USERNAME)
  await page.type("#loginPassword", PASSWORD)
  await page.click("#loginButton")
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    autoClose: false,
    defaultViewport: null,
  });
  const page = await browser.newPage();

  await login(page);
})();
