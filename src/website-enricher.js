// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import csv from 'csv-parser';
// import { chromium } from 'playwright';
// import ExcelJS from 'exceljs';
// import * as facebookProcessor from '../faceBook.js';
// import cliProgress from 'cli-progress';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const INPUT_CSV = path.join(__dirname, '..', 'src', 'outputs', 'businessLeads.csv');
// const getDateString = () => {
//   const now = new Date();
//   const yyyy = now.getFullYear();
//   const mm = String(now.getMonth() + 1).padStart(2, '0');
//   const dd = String(now.getDate()).padStart(2, '0');
//   return `${yyyy}-${mm}-${dd}`;
// };
// const OUTPUT_XLSX = path.join(__dirname, '..', 'src', 'outputs', `enrichedBusinessLeads_${getDateString()}.xlsx`);
// const BATCH_SIZE = 5;

// // ✅ Email sanitization function
// const sanitizeEmail = (raw) => {
//   if (!raw || typeof raw !== 'string') return '';
//   // Remove leading/trailing spaces and decode URI components like %20
//   let clean = raw.split('?')[0];
//   clean = decodeURIComponent(clean);
//   clean = clean.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing spaces
//   const lower = clean.toLowerCase();

//   const isValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clean);
//   if (
//     isValid &&
//     !lower.includes('example') &&
//     !lower.startsWith('test') &&
//     !lower.includes('yourmail.com') &&
//     !lower.startsWith('javascript') &&
//     !lower.startsWith('tel:')
//   ) {
//     return clean;
//   }

//   return '';
// };

// const extractCityState = (address) => {
//   if (typeof address !== 'string') return { city: 'Unknown', state: 'Unknown' };

//   const parts = address.split(',').map(p => p.trim());
//   const len = parts.length;

//   let city = 'Unknown';
//   let state = 'Unknown';

//   if (len >= 3) {
//     const cityParts = parts[len - 3].split(' ');
//     city = cityParts[cityParts.length - 1];
//     const stateParts = parts[len - 2].split(' ');
//     state = stateParts[0];
//   }

//   return { city, state };
// };

// const readCSV = (filePath) => {
//   return new Promise((resolve, reject) => {
//     if (!fs.existsSync(filePath)) return reject(new Error(`Input file not found: ${filePath}`));

//     const results = [];
//     fs.createReadStream(filePath)
//       .pipe(csv())
//       .on('data', (data) => {
//         if (data && Object.keys(data).length > 0) {
//           const name = data.Name || data.name || data.NAME || '';
//           const address = data.address || data.Address || '';
//           const { city, state } = extractCityState(address);
//           if (name) {
//             results.push({
//               ...data,
//               Name: name,
//               Website: data.Website || data.website || '',
//               //state,
//               city
//             });
//           }
//         }
//       })
//       .on('end', () => resolve(results))
//       .on('error', reject);
//   });
// };

// const extractLinks = async (page, url, skipBooking = false) => {
//   try {
//     await page.goto(url, { timeout: 20000, waitUntil: 'domcontentloaded' });
//     await page.waitForTimeout(2000);

//     const links = await page.$$eval('a', (as) =>
//       as.map((a) => ({ href: a.href, text: a.innerText?.toLowerCase().trim() || '' }))
//     );

//     const isSocial = (href) => href.includes('mailto:') || href.includes('facebook.com');

//     const match = (keyword, excludeSocial = false) =>
//       links.find((l) =>
//         (l.href.toLowerCase().includes(keyword) || l.text.includes(keyword)) &&
//         (!excludeSocial || !isSocial(l.href))
//       )?.href || '';

//     const extractEmail = () => {
//       const mailtoLink = links.find((l) => l.href.toLowerCase().startsWith('mailto:'));
//       return mailtoLink ? mailtoLink.href.replace('mailto:', '').trim() : '';
//     };

//     const rawEmail = extractEmail() || match('contact', true) || match('email', true);

//     return {
//       facebook: match('facebook'),
//       email: sanitizeEmail(rawEmail),
//     };
//   } catch (err) {
//     return { facebook: '', email: '' };
//   }
// };

// const processBatch = async (browser, businesses, startIdx, endIdx, progressBar) => {
//   const context = await browser.newContext({
//     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
//   });

//   const batchResults = [];
//   const pagePromises = [];

//   for (let i = startIdx; i < endIdx; i++) {
//     const business = businesses[i];
//     const idx = i + 1;

//     if (!business || !business.Name) {
//       progressBar.increment({ status: `⏭ Skipping invalid business` });
//       batchResults.push(null);
//       continue;
//     }

//     const { Name, Website, booking } = business;
//     const site = Website?.trim();

//     if (!site?.startsWith('http')) {
//       progressBar.increment({ status: `⏭ Skipping ${Name} - Invalid URL` });
//       batchResults.push({ ...business, facebook: '', email: '' });
//       continue;
//     }

//     let validUrl;
//     try {
//       validUrl = new URL(site);
//     } catch {
//       progressBar.increment({ status: `⏭ Skipping ${Name} - Malformed URL` });
//       batchResults.push({ ...business, facebook: '', email: '' });
//       continue;
//     }

//     pagePromises.push((async () => {
//       const page = await context.newPage();
//       try {
//         const links = await extractLinks(page, site, !!booking);
//         return {
//           index: i - startIdx,
//           data: { ...business, facebook: links.facebook, email: sanitizeEmail(links.email) }
//         };
//       } catch {
//         return {
//           index: i - startIdx,
//           data: { ...business, facebook: '', email: '' }
//         };
//       } finally {
//         await page.close();
//       }
//     })());
//   }

//   const results = await Promise.all(pagePromises);
//   await context.close();

//   results.forEach(result => {
//     const name = result?.data?.Name || 'Unknown';
//     if (result && result.data) {
//       batchResults[result.index] = result.data;
//       const shortStatus = `✔ Processed ${name}`.substring(0, 50);
//       progressBar.increment({ status: shortStatus });
//     } else {
//       progressBar.increment({ status: `❌ Failed ${name}` });
//     }
//   });

//   return batchResults.filter(Boolean);
// };

// const enrichBusinesses = async () => {
//   try {
//     console.log('🚀 Starting social link extraction');
//     const businesses = await readCSV(INPUT_CSV);
//     if (!businesses.length) throw new Error('No businesses found');

//     const browser = await chromium.launch({ headless: true, timeout: 60000 });
//     const progressBar = new cliProgress.SingleBar({
//       format: 'Progress |{bar}| {percentage}% || {value}/{total} businesses | {status}',
//       barCompleteChar: '█',
//       barIncompleteChar: '░',
//       hideCursor: true,
//       linewrap: false,
//       fps: 5
//     });
//     progressBar.start(businesses.length, 0, { status: '' });

//     const enriched = [];
//     for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
//       const batchEnd = Math.min(i + BATCH_SIZE, businesses.length);
//       const batchResults = await processBatch(browser, businesses, i, batchEnd, progressBar);
//       enriched.push(...batchResults);
//     }
//     progressBar.stop();
//     await browser.close();

//     // 🟦 Get Facebook-only emails where missing
//     const facebookRecords = enriched.filter(r => !r.email || r.email.startsWith('http'));
//     const facebookResults = await facebookProcessor.processFacebookLinks(facebookRecords);

//     const merged = [...enriched];
//     facebookResults.forEach(fb => {
//       const existing = merged.find(r => r.Website === fb.Website);
//       const cleanFbEmail = sanitizeEmail(fb.email);
//       if (existing && cleanFbEmail) {
//         existing.email = cleanFbEmail;
//       }
//     });

//     // const groupedByLocation = merged.reduce((acc, item) => {
//     //   const state = item.state || 'UnknownState';
//     //   const city = item.city || 'UnknownCity';
//     //   const key = `${state}-${city}`.substring(0, 31);
//     //   if (!acc[key]) acc[key] = [];
//     //   acc[key].push(item);
//     //   return acc;
//     // }, {});

//     const workbook = new ExcelJS.Workbook();
//     if (fs.existsSync(OUTPUT_XLSX)) {
//       await workbook.xlsx.readFile(OUTPUT_XLSX);
//     }

//     // 🔁 Use timestamp to create unique sheet name
//     const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]; // e.g., "2025-07-16-23-45-12"
//     const sheetName = `Run_${timestamp}`.substring(0, 31); // Excel sheet names max 31 chars
//     const sheet = workbook.addWorksheet(sheetName);

//     // ✅ Set up headers
//     const seen = new Set();
//     const headers = [
//       ...Object.keys(merged[0])
//         .filter(k => {
//           if (seen.has(k)) return false;
//           seen.add(k);
//           return !['email', 'facebook'].includes(k);
//         })
//         .map(k => ({ header: k, key: k })),
//       { header: 'Email', key: 'email' },
//       { header: 'Facebook', key: 'facebook' }
//     ];

//     sheet.columns = headers;

//     // ✅ Add rows with sanitized emails
//     sheet.addRows(
//       merged.map(row => {
//         row.email = sanitizeEmail(row.email);
//         return row;
//       })
//     );

//     // ✅ Save the file
//     await workbook.xlsx.writeFile(OUTPUT_XLSX);
//     console.log(`📄 Data written to ${OUTPUT_XLSX} in sheet "${sheetName}"`);
//   } catch (err) {
//     console.error('❌ Fatal error:', err.message);
//   }
// };

// if (import.meta.url === `file://${process.argv[1]}`) {
//   enrichBusinesses();
// }

// export { enrichBusinesses };
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
              city,
              state
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
          progressBar.increment({ status: `✔ Processed ${biz.Name}` });
          return { ...biz, ...links };
        } catch {
          progressBar.increment({ status: `❌ Failed ${biz.Name}` });
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