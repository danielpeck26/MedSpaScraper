// parallel-scrape.js
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { writeToCsv } from './utils.js';
import { getSearchCombosFromConfig } from './combo/searchcombos.js';

const BROWSERS = 5;
const TABS_PER_BROWSER = 5;

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function scrapePlaceDetails(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('h1', { timeout: 8000 });

    return await page.evaluate(() => {
      const getText = selector => document.querySelector(selector)?.textContent?.trim() || null;
      const getName = () => document.querySelector('h1')?.textContent?.trim() || null;
      const getRating = () => document.evaluate("//div[@class='F7nice ']/span/span", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.textContent?.trim() || null;
      const getReview = () => document.evaluate("(//div[@class='F7nice ']/span)[2]/span/span", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.textContent?.trim().replace(/[()]/g, '') || null;
      const getLink = () => Array.from(document.querySelectorAll('a')).find(a => a.href.includes('http') && a.textContent.toLowerCase().includes('website'))?.href || null;

      return {
        name: getName(),
        rating: getRating(),
        review: getReview(),
        address: getText('button[data-item-id="address"]'),
        phone: getText('button[data-tooltip="Copy phone number"]'),
        website: getLink()
      };
    });
  } catch (e) {
    console.error(`❌ Failed to scrape ${url}: ${e.message}`);
    return null;
  }
}

async function scrapeGoogleMapsParallel() {
  const searchCombos = getSearchCombosFromConfig();

  for (const location of [...new Set(searchCombos.map(c => c.split(' in ')[1]))]) {
    const combosForLoc = searchCombos.filter(q => q.endsWith(`in ${location}`));
    console.log(`📍 Processing ${location} with ${combosForLoc.length} combos...`);

    const allResults = [];

    for (const combo of combosForLoc) {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('https://maps.google.com');
      await page.fill('input[name="q"]', combo);
      await page.press('input[name="q"]', 'Enter');
      await page.waitForTimeout(4000);

      let endReached = false;
      while (!endReached) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(150);
        endReached = await page.$('//span[text()="You\'ve reached the end of the list."]') !== null;
      }

      const placeUrls = await page.$$eval('a[aria-label]', els => [...new Set(els.map(e => e.href).filter(h => h.includes('/maps/place')))]);
      await browser.close();

      const batches = chunk(placeUrls, BROWSERS * TABS_PER_BROWSER);
      for (const batch of batches) {
        const browsers = await Promise.all(Array.from({ length: BROWSERS }, () => chromium.launch({ headless: true })));

        const browserTasks = browsers.map(async (browser, bIndex) => {
          const context = await browser.newContext();
          const tabs = await Promise.all(Array.from({ length: TABS_PER_BROWSER }, (_, tIndex) => context.newPage()));
          const results = [];

          for (let t = 0; t < TABS_PER_BROWSER; t++) {
            const idx = bIndex * TABS_PER_BROWSER + t;
            const url = batch[idx];
            if (!url) continue;
            const result = await scrapePlaceDetails(tabs[t], url);
            if (result) results.push({ ...result, query: combo });
            await tabs[t].close();
          }

          await context.close();
          await browser.close();
          return results;
        });

        const results = (await Promise.all(browserTasks)).flat();
        allResults.push(...results);
      }
    }

    const outputDir = path.join('src', 'outputs');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${location}.csv`);
    await writeToCsv(outputPath, allResults);
    console.log(`✅ Saved ${allResults.length} records for ${location} to ${outputPath}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeGoogleMapsParallel();
}
