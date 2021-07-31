import puppeteer from "puppeteer";
import { PythonShell } from "python-shell";

async function detectAMQ(browser) {
  const pages = await browser.pages();
  for (const page of pages) {
    const url = page.url();
    const isHidden = await page.evaluate(() => document.hidden);
    if (!isHidden && url == "https://animemusicquiz.com/") {
      return page;
    }
  }
  const page = await browser.newPage();
  await page.goto("https://animemusicquiz.com/");
  return page;
}

async function saveSong(song) {
  const opts = { args: [song[0], song[1], song[2], song[3], song[4]] };
  PythonShell.run("write.py", opts, (err) => {
    if (err) throw err;
  });
}

async function makeSong(page) {
  const song = await page.$$eval(
    "#qpAnimeName, #qpSongName, #qpSongArtist, #qpSongType",
    (elems) => elems.map((e) => e.textContent)
  );
  song.push(await page.$eval("#qpSongVideoLink", (e) => e.href));
  return song;
}

(async () => {
  const browser = await puppeteer.connect({
    browserURL: "http://127.0.0.1:4444",
    defaultViewport: null,
  });

  const page = await detectAMQ(browser);
  page.setDefaultTimeout(0);

  while (true) {
    await page.waitForXPath(
      '//div[@id="qpAnimeNameHider" and contains(@class, "hide")]'
    );

    const song = await makeSong(page);
    await saveSong(song);

    await page.waitForXPath(
      '//div[@id="qpAnimeNameHider" and not(contains(@class, "hide"))]'
    );
  }
})();
