import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { chromium } from 'playwright';
import ExcelJS from 'exceljs';
import * as facebookProcessor from '../faceBook.js';
import cliProgress from 'cli-progress';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_CSV = path.join(__dirname, '..', 'src', 'outputs', 'businessLeads.csv');
const OUTPUT_XLSX = path.join(__dirname, '..', 'src', 'outputs', `enrichedBusinessLeads_${getDateString()}.xlsx`);

function getDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function sanitizeEmail(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let clean = raw.split('?')[0];
  clean = decodeURIComponent(clean).trim().toLowerCase();

  const isValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clean);
  if (
    isValid &&
    !clean.includes('example') &&
    !clean.startsWith('test') &&
    !clean.includes('yourmail.com') &&
    !clean.startsWith('javascript') &&
    !clean.startsWith('tel:')
  ) {
    return clean;
  }

  return '';
}

function extractCityState(address) {
  if (typeof address !== 'string') return { city: 'Unknown', state: 'Unknown' };
  const parts = address.split(',').map(p => p.trim());
  const len = parts.length;
  let city = 'Unknown', state = 'Unknown';

  if (len >= 3) {
    city = parts[len - 3].split(' ').pop();
    state = parts[len - 2].split(' ')[0];
  }

  return { city, state };
}

async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) return reject(new Error(`Input file not found: ${filePath}`));

    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        if (data && Object.keys(data).length > 0) {
          const name = data.Name || data.name || data.NAME || '';
          const address = data.address || data.Address || '';
          const { city, state } = extractCityState(address);
          if (name) {
            results.push({
              ...data,
              Name: name,
              Website: data.Website || data.website || '',
              //state,
              city
            });
          }
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function extractLinks(page, url) {
  try {
    await page.goto(url, { timeout: 20000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const links = await page.$$eval('a', (as) =>
      as.map((a) => ({ href: a.href, text: a.innerText?.toLowerCase().trim() || '' }))
    );

    const isSocial = (href) => href.includes('mailto:') || href.includes('facebook.com');
    const match = (keyword, excludeSocial = false) =>
      links.find((l) =>
        (l.href.toLowerCase().includes(keyword) || l.text.includes(keyword)) &&
        (!excludeSocial || !isSocial(l.href))
      )?.href || '';

    const rawEmail = links.find(l => l.href.startsWith('mailto:'))?.href.replace('mailto:', '') || match('contact', true) || match('email', true);

    return {
      facebook: match('facebook'),
      email: sanitizeEmail(rawEmail)
    };
  } catch {
    return { facebook: '', email: '' };
  }
}

async function enrichBusinesses() {
  try {
    console.log('🚀 Starting social link enrichment');
    const startTime = Date.now();
    console.log(`⏱ enrichBusinesses started at: ${new Date(startTime).toLocaleString()}`);
    const businesses = await readCSV(INPUT_CSV);
    if (!businesses.length) throw new Error('No businesses found');

    const browser = await chromium.launch({ headless: true });
    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% || {value}/{total} businesses | {status}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      fps: 5
    });

    progressBar.start(businesses.length, 0, { status: '' });

    const MAX_CONCURRENT = 10;
    const enriched = [];

    for (let i = 0; i < businesses.length; i += MAX_CONCURRENT) {
      const batch = businesses.slice(i, i + MAX_CONCURRENT);

      const context = await browser.newContext();
      const pages = await Promise.all(batch.map(() => context.newPage()));

      const results = await Promise.all(batch.map(async (biz, idx) => {
        const page = pages[idx];
        const url = biz.Website?.startsWith('http') ? biz.Website : null;
        if (!url) {
          progressBar.increment({ status: `⏭ Skipping ${biz.Name} - No valid URL` });
          await page.close();
          return { ...biz, facebook: '', email: '' };
        }

        try {
          const links = await extractLinks(page, url);
          const skipStatus = `⏭ Skipping ${biz.Name}`.slice(0, 40);
          progressBar.increment({ status: skipStatus });
          return { ...biz, ...links };
        } catch {
          const failStatus = `❌ Failed ${biz.Name}`.slice(0, 40);
          progressBar.increment({ status: failStatus });
          return { ...biz, facebook: '', email: '' };
        } finally {
          await page.close();
        }
      }));

      enriched.push(...results);
      await context.close();
    }

    progressBar.stop();
    await browser.close();
    const finishTime = Date.now();
    console.log(`✅ enrichBusinesses finished at: ${new Date(finishTime).toLocaleString()}`);
    //console.log(`⏳ Total time: ${((finishTime - startTime) / 1000).toFixed(2)} seconds`);
    const fbOnly = enriched.filter(r => !r.email || r.email.startsWith('http'));
    const fbResults = await facebookProcessor.processFacebookLinks(fbOnly);

    fbResults.forEach(fb => {
      const existing = enriched.find(r => r.Website === fb.Website);
      const clean = sanitizeEmail(fb.email);
      if (existing && clean) existing.email = clean;
    });

    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(OUTPUT_XLSX)) {
      await workbook.xlsx.readFile(OUTPUT_XLSX);
    }

    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    const sheetName = `Run_${timestamp}`.substring(0, 31);
    const sheet = workbook.addWorksheet(sheetName);

    const seen = new Set();
    const headers = [
      ...Object.keys(enriched[0])
        .filter(k => {
          if (seen.has(k)) return false;
          seen.add(k);
          return !['email', 'facebook'].includes(k);
        })
        .map(k => ({ header: k, key: k })),
      { header: 'Email', key: 'email' },
      { header: 'Facebook', key: 'facebook' }
    ];

    sheet.columns = headers;
    sheet.addRows(enriched.map(r => ({ ...r, email: sanitizeEmail(r.email) })));
    await workbook.xlsx.writeFile(OUTPUT_XLSX);

    console.log(`📄 Saved to ${OUTPUT_XLSX} in sheet "${sheetName}"`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  enrichBusinesses();
}

export { enrichBusinesses };
