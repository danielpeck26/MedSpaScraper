import puppeteer from 'puppeteer';
import cliProgress from 'cli-progress';
import fs from 'fs';

const DEBUG = false;

const NUM_BROWSERS = 5;
const TABS_PER_BROWSER = 5;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractEmailFromFacebook(url, page) {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (!response || !response.ok()) return null;

    await delay(3000 + Math.random() * 2000);
    await page.keyboard.press('Escape');

    const htmlContent = await page.content();
    const emailMatch = htmlContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi);

    if (emailMatch && emailMatch.length > 0) {
      return emailMatch.find(email => !email.includes('example') && !email.startsWith('test'));
    }
  } catch (err) {
    if (DEBUG) {
      fs.appendFileSync('debug.log', `❌ Error visiting ${url}: ${err.message}\n`);
    }
    // Silently skip
  }
  return null;
}

async function processFacebookLinks(records) {
  const fbRecords = records.filter(r => r.facebook?.trim());
  console.log(`📘 Checking ${fbRecords.length} Facebook URLs for emails...`);

  const progressBar = new cliProgress.SingleBar({
    format: 'Facebook Scrape |{bar}| {percentage}% || {value}/{total} profiles',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });
  progressBar.start(fbRecords.length, 0);

  const chunkSize = NUM_BROWSERS * TABS_PER_BROWSER;
  for (let i = 0; i < fbRecords.length; i += chunkSize) {
    const chunk = fbRecords.slice(i, i + chunkSize);

    const browsers = await Promise.all(
      Array.from({ length: NUM_BROWSERS }, () => puppeteer.launch({ headless: true }))
    );

    const tabGroups = [];

    for (let b = 0; b < NUM_BROWSERS; b++) {
      const browser = browsers[b];
      const context = browser;

      const slice = chunk.slice(b * TABS_PER_BROWSER, (b + 1) * TABS_PER_BROWSER);
      const tabs = await Promise.all(slice.map(() => context.newPage()));
      tabGroups.push({ context, tabs, records: slice });
    }

    for (let g = 0; g < tabGroups.length; g++) {
      const group = tabGroups[g];
      for (let j = 0; j < group.records.length; j++) {
        const record = group.records[j];
        const page = group.tabs[j];
        if (!record?.facebook?.trim()) {
          progressBar.increment();
          await page.close();
          continue;
        }
        try {
          const email = await extractEmailFromFacebook(record.facebook, page);
          if (email) {
            record.email = email.trim();
          }
        } catch {
          // silently skip
        } finally {
          progressBar.increment();
          await page.close();
        }
      }
      await group.context.close();
    }

    await Promise.all(browsers.map(b => b.close()));
    await delay(3000 + Math.random() * 2000);
  }

  progressBar.stop();
  const finishTime = Date.now();
  console.log(`✅ Completed Facebook scraping at: ${new Date(finishTime).toLocaleString()}`);
  console.log(`✅ Completed Facebook scraping for ${fbRecords.length} profiles.`);
  return records;
}

export { processFacebookLinks };
