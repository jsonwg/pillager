import puppeteer from "puppeteer";
import { PythonShell } from "python-shell";

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
  const browserURL = "http://127.0.0.1:4444";
  const browser = await puppeteer.connect({
    browserURL,
    defaultViewport: null,
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(0);
  await page.goto("https://animemusicquiz.com/");

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
