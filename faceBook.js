import puppeteer from 'puppeteer';
import cliProgress from 'cli-progress';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractEmailFromFacebook(url, page) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await delay(3000 + Math.random() * 2000);
    await page.keyboard.press('Escape');

    const htmlContent = await page.content();
    const emailMatch = htmlContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi);

    if (emailMatch && emailMatch.length > 0) {
      return emailMatch.find(email => !email.includes('example') && !email.startsWith('test'));
    }
  } catch (err) {
    process.stderr.write(`\n❌ Error visiting ${url}: ${err.message}\n`);
  }
  return null;
}

async function processFacebookLinks(records, batchSize = 5) {
  const fbRecords = records.filter(r => r.facebook?.trim());
  console.log(`📘 Checking ${fbRecords.length} Facebook URLs for emails...`);

  const browser = await puppeteer.launch({ headless: true });
  //const context = await browser.createIncognitoBrowserContext();

  const progressBar = new cliProgress.SingleBar({
    format: 'Facebook Scrape |{bar}| {percentage}% || {value}/{total} profiles',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });
  progressBar.start(fbRecords.length, 0);

  for (let i = 0; i < fbRecords.length; i += batchSize) {
    const batch = fbRecords.slice(i, i + batchSize);
    const pages = await Promise.all(batch.map(() => browser.newPage()));

    await Promise.all(batch.map(async (record, idx) => {
      const page = pages[idx];
      const email = await extractEmailFromFacebook(record.facebook, page);
      if (email) {
        record.email = email;
      }
      await page.close();
      progressBar.increment();
    }));

    await delay(3000 + Math.random() * 2000); // throttle between batches
  }

  progressBar.stop();
  await browser.close();

  console.log(`✅ Completed Facebook scraping for ${fbRecords.length} profiles.`);
  return records;
}

export { processFacebookLinks };
