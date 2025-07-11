import { chromium } from 'playwright';
import { writeToCsv } from './utils.js';
import fs from 'fs';
import path from 'path';
import { getSearchCombosFromConfig } from './combo/searchCombos.js';
import cliProgress from 'cli-progress';
import { parseLocation } from 'parse-address';
import pkg from 'us-state-converter';

const abbreviationToFull = pkg.abbreviationToFull;

function extractStateFromAddress(address) {
  const match = address.match(/,\s*[A-Za-z\s]+,\s*([A-Z]{2})\s+\d{5}/);
  return match ? match[1] : null;
}

function getStateFromAddress(address) {
  const parsed = parseLocation(address);
  return parsed?.state || extractStateFromAddress(address);
}

const stateAbbrToFull = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

async function scrapeGoogleMaps(searchQuery) {
  console.log('\n=== STARTING SCRAPER ===');
  console.log(`🔍 Search Query: "${searchQuery}"`);

  const searchCombos = searchQuery ? [searchQuery] : getSearchCombosFromConfig();
  let resultUrls = [];

  const tempBrowser = await chromium.launch({ headless: false });
  const context = await tempBrowser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
  });
  const page = await context.newPage();
  await page.goto('https://maps.google.com');

  for (const query of searchCombos) {
    console.log(`\n🔎 Searching: "${query}"`);
    await page.fill('input[name="q"]', query);
    await page.press('input[name="q"]', 'Enter');
    await page.waitForTimeout(5000);
        try {
      await page.click('//h1[text()="Results"]');
    } catch (error) {
      console.warn('⚠️ Could not click results header:', error.message);
    }
    let endOfListReached = false;
    let scrollCount = 0;
    while (!endOfListReached) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);
      scrollCount++;
      if (scrollCount % 150 === 0) {
      console.log(`🔄 Still scrolling... didn't reached end of business results list.`);
      }
      endOfListReached = await page.$('//span[text()="You\'ve reached the end of the list."]') !== null;
    }

    const newUrls = await page.$$eval('a[aria-label]', els =>
      els.map(el => el.href).filter(href => href.includes('/maps/place'))
    );
    resultUrls = [...resultUrls, ...newUrls];
    console.log(`✅ Collected URLs: ${resultUrls.length}`);
  }

  await tempBrowser.close();
  resultUrls = [...new Set(resultUrls)];
  console.log(`\n✅ Deduplicated URLs: ${resultUrls.length}`);
  console.log(`\n=== PHASE 2: SCRAPING PLACE DETAILS ===`);

  const NUM_BROWSERS = 5;
  const TABS_PER_BROWSER = 5;
  const results = [];
  const chunkedUrls = [];
  for (let i = 0; i < resultUrls.length; i += NUM_BROWSERS * TABS_PER_BROWSER) {
    chunkedUrls.push(resultUrls.slice(i, i + NUM_BROWSERS * TABS_PER_BROWSER));
  }

  const progressBar = new cliProgress.SingleBar({
    format: 'Progress |{bar}| {percentage}% || {value}/{total} URLs',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });
  progressBar.start(resultUrls.length, 0);

  for (let chunkIndex = 0; chunkIndex < chunkedUrls.length; chunkIndex++) {
    const chunk = chunkedUrls[chunkIndex];
    const browsers = await Promise.all(Array.from({ length: NUM_BROWSERS }, () => chromium.launch({ headless: true })));
    const tabGroups = [];

    for (let i = 0; i < NUM_BROWSERS; i++) {
      const context = await browsers[i].newContext();
      const urlsForThisBrowser = chunk.slice(i * TABS_PER_BROWSER, (i + 1) * TABS_PER_BROWSER);
      const tabs = await Promise.all(urlsForThisBrowser.map(() => context.newPage()));
      tabGroups.push({ context, tabs, urls: urlsForThisBrowser });
    }

    for (let groupIndex = 0; groupIndex < tabGroups.length; groupIndex++) {
      const group = tabGroups[groupIndex];
      for (let i = 0; i < group.tabs.length; i++) {
        const tab = group.tabs[i];
        const url = group.urls[i];
        if (!url) continue;

        try {
          await tab.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await tab.waitForSelector('h1', { timeout: 8000 });

          const details = await tab.evaluate(() => {
            const getText = (selector) => {
              const el = document.querySelector(selector);
              return el ? el.textContent.replace(/^[^\w\d+]+/, '').replace(/\s+/g, ' ').trim() : null;
            };

            const getName = () => document.querySelector('h1')?.textContent?.trim() || null;
            const getRating = () => document.evaluate("//div[@class='F7nice ']/span/span", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.textContent?.trim() || null;
            const getReview = () => document.evaluate("(//div[@class='F7nice ']/span)[2]/span/span", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.textContent?.replace(/[()]/g, '') || null;

            return {
              name: getName(),
              review: getReview(),
              rating: getRating(),
              address: getText('button[data-item-id="address"]'),
              phone: getText('button[data-tooltip="Copy phone number"]'),
              website: document.querySelector('a[data-tooltip="Open website"]')?.href || null,
              hours: getText('div[data-tooltip="Open hours"] > div > div'),
              services: Array.from(document.querySelectorAll('div[aria-label="Service options"] button'))
                .map(el => el.getAttribute('aria-label')).filter(Boolean)
            };
          });

          let state = null;
          if (details.address) {
            const abbreviation = getStateFromAddress(details.address);
            if (abbreviation) {
              state = abbreviation && stateAbbrToFull[abbreviation.trim().toUpperCase()] || null;
            }
          }
          
          results.push({ ...details, state });
          // if (results.length % 10 === 0) {
          //   console.log(`[+] Scraped ${results.length} places...`);
          // }
        } catch (err) {
          console.warn(`❌ Error scraping ${url}: ${err.message}`);
        } finally {
          progressBar.increment();
          await tab.close();
        }
      }
      await group.context.close();
    }
    await Promise.all(browsers.map(b => b.close()));
  }

  progressBar.stop();

  const outputDir = path.join(path.resolve(), 'src', 'outputs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, 'businessLeads.csv');
  await writeToCsv(outputFile, results);
  console.log(`\n💾 Saved ${results.length} records to: ${outputFile}`);
  console.log('\n=== SCRAPING COMPLETE ===\n');
  return results;
}

export { scrapeGoogleMaps };

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const searchQuery = process.argv.length > 2 ? process.argv.slice(2).join(" ") : "boat rental in Fort Lauderdale";
      await scrapeGoogleMaps(searchQuery);
    } catch (err) {
      console.error("❌ Direct execution error:", err);
      process.exit(1);
    }
  })();
}
