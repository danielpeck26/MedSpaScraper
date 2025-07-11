// // import fs from 'fs';
// // import path from 'path';
// // import { fileURLToPath } from 'url';
// // import csv from 'csv-parser';
// // import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
// // import { chromium } from 'playwright';
// // import * as facebookProcessor from '../faceBook.js';
// // import cliProgress from 'cli-progress';

// // // Constants for __dirname in ES Modules
// // const __filename = fileURLToPath(import.meta.url);
// // const __dirname = path.dirname(__filename);

// // // Config
// // const INPUT_CSV = path.join(__dirname, '..', 'src', 'outputs', 'businessLeads.csv');
// // const OUTPUT_CSV = path.join(__dirname, '..', 'src', 'outputs', 'enrichedBusinessLeads.csv');
// // const BATCH_SIZE = 5;

// // if (!fs.existsSync(path.dirname(OUTPUT_CSV))) {
// //   fs.mkdirSync(path.dirname(OUTPUT_CSV), { recursive: true });
// // }

// // const readCSV = (filePath) => {
// //   return new Promise((resolve, reject) => {
// //     if (!fs.existsSync(filePath)) {
// //       return reject(new Error(`Input file not found: ${filePath}`));
// //     }

// //     const results = [];
// //     fs.createReadStream(filePath)
// //       .pipe(csv())
// //       .on('data', (data) => {
// //         if (data && Object.keys(data).length > 0) {
// //           const name = data.Name || data.name || data.NAME || '';
// //           if (name) {
// //             results.push({
// //               ...data,
// //               Name: name,
// //               Website: data.Website || data.website || '',
// //               state: data.state || data.State || ''
// //             });
// //           }
// //         }
// //       })
// //       .on('end', () => {
// //         if (results.length === 0) {
// //           console.warn('⚠️ CSV file is empty or has no valid data');
// //         }
// //         resolve(results);
// //       })
// //       .on('error', reject);
// //   });
// // };

// // const extractLinks = async (page, url, skipBooking = false) => {
// //   try {
// //     await page.goto(url, { timeout: 20000, waitUntil: 'domcontentloaded' });
// //     await page.waitForTimeout(2000);

// //     const links = await page.$$eval('a', (as) =>
// //       as.map((a) => ({
// //         href: a.href,
// //         text: a.innerText?.toLowerCase().trim() || '',
// //       }))
// //     );

// //     const isSocial = (href) =>
// //       href.includes('mailto:') ||
// //       href.includes('facebook.com');

// //     const match = (keyword, excludeSocial = false) =>
// //       links.find((l) =>
// //         (l.href.toLowerCase().includes(keyword) || l.text.includes(keyword)) &&
// //         (!excludeSocial || !isSocial(l.href))
// //       )?.href || '';

// //     const extractEmail = () => {
// //       const mailtoLink = links.find((l) => l.href.toLowerCase().startsWith('mailto:'));
// //       return mailtoLink ? mailtoLink.href.replace('mailto:', '').trim() : '';
// //     };

// //     return {
// //       facebook: match('facebook'),
// //       yelp: match('yelp.com'),
// //       email: extractEmail() || match('contact', true) || match('email', true),
// //     };
// //   } catch (err) {
// //     console.warn(`⚠️ Failed to scrape ${url}: ${err.message}`);
// //     return { booking: '', instagram: '', facebook: '', whatsapp: '', yelp: '', email: '' };
// //   }
// // };

// // // const processBatch = async (browser, businesses, startIdx, endIdx) => {
// // //   const context = await browser.newContext({
// // //     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
// // //   });

// // //   const batchResults = [];
// // //   const pagePromises = [];

// // //   for (let i = startIdx; i < endIdx; i++) {
// // //     const business = businesses[i];

// // //     if (!business || !business.Name) {
// // //       console.log(`⏭ Skipping invalid business at index ${i}`);
// // //       batchResults.push(null);
// // //       continue;
// // //     }

// // //     const { Name, Website, booking } = business;
// // //     const site = Website?.trim();
// // //     const existingBooking = booking?.trim();

// // //     if (!site?.startsWith('http')) {
// // //       console.log(`⏭ [${i + 1}/${businesses.length}] Skipping ${Name} - Invalid URL`);
// // //       batchResults.push({
// // //         ...business,        
// // //         facebook: '',        
// // //         yelp: '',
// // //         email: ''
// // //       });
// // //       continue;
// // //     }

// // //     //console.log(`🔎 [${i + 1}/${businesses.length}] Processing ${Name}`);

// // //     pagePromises.push((async () => {
// // //       const page = await context.newPage();
// // //       try {
// // //         const links = await extractLinks(page, site, !!existingBooking);
// // //         return {
// // //           index: i - startIdx,
// // //           data: {
// // //             ...business,                       
// // //             facebook: links.facebook,           
// // //             yelp: links.yelp,
// // //             email: links.email,
// // //           }
// // //         };
// // //       } catch (err) {
// // //         console.warn(`⚠️ Error processing ${Name}: ${err.message}`);
// // //         return {
// // //           index: i - startIdx,
// // //           data: {
// // //             ...business,            
// // //             facebook: '',            
// // //             yelp: '',
// // //             email: '',
// // //           }
// // //         };
// // //       } finally {
// // //         await page.close();
// // //       }
// // //     })());
// // //   }

// // //   const results = await Promise.all(pagePromises);
// // //   await context.close();

// // //   results.forEach(result => {
// // //     if (result && result.data) {
// // //       batchResults[result.index] = result.data;
// // //     }
// // //   });

// // //   return batchResults.filter(Boolean);
// // // };
// // const processBatch = async (browser, businesses, startIdx, endIdx, progressBar) => {
// //   const context = await browser.newContext({
// //     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
// //   });

// //   const batchResults = [];
// //   const pagePromises = [];

// //   for (let i = startIdx; i < endIdx; i++) {
// //     const business = businesses[i];

// //     if (!business || !business.Name) {
// //       process.stderr.write(`\n⏭ Skipping invalid business at index ${i}\n`);
// //       batchResults.push(null);
// //       progressBar.increment(); // ✅ still increment
// //       continue;
// //     }

// //     const { Name, Website, booking } = business;
// //     const site = Website?.trim();
// //     const existingBooking = booking?.trim();

// //     if (!site?.startsWith('http')) {
// //       process.stderr.write(`\n⏭ [${i + 1}/${businesses.length}] Skipping ${Name} - Invalid URL\n`);
// //       batchResults.push({
// //         ...business,
// //         facebook: '',
// //         yelp: '',
// //         email: ''
// //       });
// //       progressBar.increment(); // ✅ still increment
// //       continue;
// //     }

// //     // Additional URL validation
// //     let validUrl;
// //     try {
// //       validUrl = new URL(site);
// //     } catch (urlError) {
// //       process.stderr.write(`\n⏭ [${i + 1}/${businesses.length}] Skipping ${Name} - Malformed URL: ${site}\n`);
// //       batchResults.push({
// //         ...business,
// //         facebook: '',
// //         yelp: '',
// //         email: ''
// //       });
// //       progressBar.increment(); // ✅ still increment
// //       continue;
// //     }

// //     pagePromises.push((async () => {
// //       const page = await context.newPage();
// //       try {
// //         const links = await extractLinks(page, site, !!existingBooking);
// //         return {
// //           index: i - startIdx,
// //           data: {
// //             ...business,
// //             facebook: links.facebook,
// //             yelp: links.yelp,
// //             email: links.email,
// //           }
// //         };
// //       } catch (err) {
// //         process.stderr.write(`\n⚠️ Error processing ${Name}: ${err.message}\n`);
// //         return {
// //           index: i - startIdx,
// //           data: {
// //             ...business,
// //             facebook: '',
// //             yelp: '',
// //             email: '',
// //           }
// //         };
// //       } finally {
// //         await page.close();
// //         //progressBar.increment(); // ✅ always increment exactly once
// //       }
// //     })());
// //   }

// //   const results = await Promise.all(pagePromises);
// //   await context.close();

// //   results.forEach(result => {
// //     if (result && result.data) {
// //       batchResults[result.index] = result.data;
// //     }
// //     progressBar.increment(); // ✅ increment here safely
// //   });

// //   return batchResults.filter(Boolean);
// // };


// // const enrichBusinesses = async () => {
// //   try {
// //     console.log('🚀 Starting social link extraction');
// //     const businesses = await readCSV(INPUT_CSV);
// //     const state = businesses[0]?.state || 'Unknown State';
// //     if (!businesses || businesses.length === 0) {
// //       throw new Error('No valid businesses found in CSV');
// //     }

// //     console.log(`📊 Loaded ${businesses.length} businesses from CSV`);

// //     const browser = await chromium.launch({
// //       headless: true,
// //       timeout: 60000
// //     });

// //     const enriched = [];
// //     // ✅ Progress bar setup
// //     const progressBar = new cliProgress.SingleBar({
// //       format: 'Progress |{bar}| {percentage}% || {value}/{total} businesses',
// //       barCompleteChar: '\u2588',
// //       barIncompleteChar: '\u2591',
// //       hideCursor: true
// //     });
// //     progressBar.start(businesses.length, 0);

// //     for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
// //       const batchEnd = Math.min(i + BATCH_SIZE, businesses.length);
// //       const batchResults = await processBatch(browser, businesses, i, batchEnd, progressBar); // ✅ passed
// //       enriched.push(...batchResults);
// //     }
// //     progressBar.stop();
// //     await browser.close();

// //     if (enriched.length === 0) {
// //       throw new Error('No valid enriched data to write');
// //     }

// //     const headers = [
// //       ...Object.keys(enriched[0])
// //         .filter(key => !['email', 'facebook', 'yelp'].includes(key))
// //         .map(id => ({ id, title: id })),
// //       { id: 'email', title: 'Email' },
// //       { id: 'facebook', title: 'Facebook' },
// //       { id: 'yelp', title: 'Yelp' }

// //     ];

// //     const facebookRecords = enriched.filter(record =>
// //       (!record.email || record.email.startsWith('http'))
// //     );

// //     const facebookResults = await facebookProcessor.processFacebookLinks(facebookRecords);

// //     const mergedResults = [...enriched];

// //     facebookResults.forEach(fbResult => {
// //       const existingRecord = mergedResults.find(record => record.Website === fbResult.Website);
// //       if (existingRecord) {
// //         existingRecord.email = fbResult.email || existingRecord.email;
// //       } else {
// //         mergedResults.push(fbResult);
// //       }
// //     });

// //     const uniqueResults = mergedResults.filter((record, index, self) =>
// //       index === self.findIndex(r => r.Website === record.Website)
// //     );

// //     const writer = createCsvWriter({
// //       path: OUTPUT_CSV,
// //       header: headers,
// //       alwaysQuote: true,
// //       encoding: 'utf8',
// //       sheetName: state // Use state name as sheet name
// //     });

// //     await writer.writeRecords(uniqueResults);
// //     console.log(`\n✅ Successfully processed ${uniqueResults.length} records`);
// //     console.log(`📁 Results saved to: ${OUTPUT_CSV}`);
// //     return enriched;
// //   } catch (err) {
// //     console.error('❌ Fatal error in enrichBusinesses:', err.message);
// //     throw err;
// //   }
// // };

// // // Support both import and direct execution
// // if (import.meta.url === `file://${process.argv[1]}`) {
// //   enrichBusinesses().catch(err => {
// //     console.error('❌ Process failed:', err.message);
// //     process.exit(1);
// //   });
// // }

// // export { enrichBusinesses, extractLinks, readCSV };
// // enrichBusinesses.js
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import csv from 'csv-parser';
// import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
// import { chromium } from 'playwright';
// import * as facebookProcessor from '../faceBook.js';
// import cliProgress from 'cli-progress';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const INPUT_CSV = path.join(__dirname, '..', 'src', 'outputs', 'businessLeads.csv');
// const OUTPUT_CSV = path.join(__dirname, '..', 'src', 'outputs', 'enrichedBusinessLeads.csv');
// const BATCH_SIZE = 5;

// if (!fs.existsSync(path.dirname(OUTPUT_CSV))) {
//   fs.mkdirSync(path.dirname(OUTPUT_CSV), { recursive: true });
// }

// const readCSV = (filePath) => {
//   return new Promise((resolve, reject) => {
//     if (!fs.existsSync(filePath)) return reject(new Error(`Input file not found: ${filePath}`));

//     const results = [];
//     fs.createReadStream(filePath)
//       .pipe(csv())
//       .on('data', (data) => {
//         if (data && Object.keys(data).length > 0) {
//           const name = data.Name || data.name || data.NAME || '';
//           if (name) {
//             results.push({
//               ...data,
//               Name: name,
//               Website: data.Website || data.website || '',
//               state: data.state || data.State || ''
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

//     return {
//       facebook: match('facebook'),
//       yelp: match('yelp.com'),
//       email: extractEmail() || match('contact', true) || match('email', true),
//     };
//   } catch (err) {
//     return { facebook: '', yelp: '', email: '' };
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
//       progressBar.update(idx, { status: `⏭ Skipping invalid business` });
//       batchResults.push(null);
//       continue;
//     }

//     const { Name, Website, booking } = business;
//     const site = Website?.trim();
//     const existingBooking = booking?.trim();

//     if (!site?.startsWith('http')) {
//       progressBar.update(idx, { status: `⏭ Skipping ${Name} - Invalid URL` });
//       batchResults.push({ ...business, facebook: '', yelp: '', email: '' });
//       continue;
//     }

//     let validUrl;
//     try {
//       validUrl = new URL(site);
//     } catch {
//       progressBar.update(idx, { status: `⏭ Skipping ${Name} - Malformed URL` });
//       batchResults.push({ ...business, facebook: '', yelp: '', email: '' });
//       continue;
//     }

//     pagePromises.push((async () => {
//       const page = await context.newPage();
//       try {
//         const links = await extractLinks(page, site, !!existingBooking);
//         return {
//           index: i - startIdx,
//           data: { ...business, facebook: links.facebook, yelp: links.yelp, email: links.email }
//         };
//       } catch (err) {
//         progressBar.update(idx, { status: `⚠️ Failed ${Name}` });
//         return {
//           index: i - startIdx,
//           data: { ...business, facebook: '', yelp: '', email: '' }
//         };
//       } finally {
//         await page.close();
//         progressBar.update(idx);
//       }
//     })());
//   }

//   const results = await Promise.all(pagePromises);
//   await context.close();

//   results.forEach(result => {
//     if (result && result.data) {
//       batchResults[result.index] = result.data;
//     }
//   });

//   return batchResults.filter(Boolean);
// };

// const enrichBusinesses = async () => {
//   try {
//     console.log('🚀 Starting social link extraction');
//     const businesses = await readCSV(INPUT_CSV);
//     if (!businesses || businesses.length === 0) throw new Error('No businesses found');
//     console.log(`📊 Loaded ${businesses.length} businesses`);

//     const browser = await chromium.launch({ headless: true, timeout: 60000 });
//     const enriched = [];

//     const progressBar = new cliProgress.SingleBar({
//       format: 'Progress |{bar}| {percentage}% || {value}/{total} businesses | {status}',
//       barCompleteChar: '█',
//       barIncompleteChar: '░',
//       hideCursor: true,
//       linewrap: false
//     });
//     progressBar.start(businesses.length, 0, { status: '' });

//     for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
//       const batchEnd = Math.min(i + BATCH_SIZE, businesses.length);
//       const batchResults = await processBatch(browser, businesses, i, batchEnd, progressBar);
//       enriched.push(...batchResults);
//     }
//     progressBar.stop();
//     await browser.close();

//     const headers = [
//       ...Object.keys(enriched[0]).filter(k => !['email', 'facebook'].includes(k)).map(id => ({ id, title: id })),
//       { id: 'email', title: 'Email' },
//       { id: 'facebook', title: 'Facebook' },      
//     ];

//     const facebookRecords = enriched.filter(r => !r.email || r.email.startsWith('http'));
//     const facebookResults = await facebookProcessor.processFacebookLinks(facebookRecords);
//     const mergedResults = [...enriched];

//     facebookResults.forEach(fb => {
//       const existing = mergedResults.find(r => r.Website === fb.Website);
//       if (existing) existing.email = fb.email || existing.email;
//       else mergedResults.push(fb);
//     });

//     const uniqueResults = mergedResults.filter((r, i, arr) => i === arr.findIndex(x => x.Website === r.Website));
//     const stateName = uniqueResults[0]?.state || 'Unknown State';
//     //console.log(`📍 State Name: ${stateName}`);
//     uniqueResults.forEach(record => {
//       if (record.email && record.email.startsWith('http')) {
//         record.email = '';
//       }
//     });
//     const writer = createCsvWriter({ 
//       path: OUTPUT_CSV, 
//       header: headers, 
//       alwaysQuote: true, 
//       encoding: 'utf8', 
//       sheetName: stateName // Add sheet name for the CSV file
//     });
//     await writer.writeRecords(uniqueResults);
//     console.log(`\n✅ Successfully processed ${uniqueResults.length} records`);
//     console.log(`📁 Results saved to: ${OUTPUT_CSV}`);
//   } catch (err) {
//     console.error('❌ Fatal error:', err.message);
//   }
// };

// if (import.meta.url === `file://${process.argv[1]}`) {
//   enrichBusinesses();
// }

// export { enrichBusinesses };
// enrichBusinesses.js
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

// const readCSV = (filePath) => {
//   return new Promise((resolve, reject) => {
//     if (!fs.existsSync(filePath)) return reject(new Error(`Input file not found: ${filePath}`));

//     const results = [];
//     fs.createReadStream(filePath)
//       .pipe(csv())
//       .on('data', (data) => {
//         if (data && Object.keys(data).length > 0) {
//           const name = data.Name || data.name || data.NAME || '';
//           if (name) {
//             results.push({
//               ...data,
//               Name: name,
//               Website: data.Website || data.website || '',
//               state: data.state || data.State || 'Unknown'
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

//     return {
//       facebook: match('facebook'),
//       yelp: match('yelp.com'),
//       email: extractEmail() || match('contact', true) || match('email', true),
//     };
//   } catch (err) {
//     return { facebook: '', yelp: '', email: '' };
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
//       progressBar.update(idx, { status: `⏭ Skipping invalid business` });
//       batchResults.push(null);
//       continue;
//     }

//     const { Name, Website, booking } = business;
//     const site = Website?.trim();

//     if (!site?.startsWith('http')) {
//       progressBar.update(idx, { status: `⏭ Skipping ${Name} - Invalid URL` });
//       batchResults.push({ ...business, facebook: '', yelp: '', email: '' });
//       continue;
//     }

//     let validUrl;
//     try {
//       validUrl = new URL(site);
//     } catch {
//       progressBar.update(idx, { status: `⏭ Skipping ${Name} - Malformed URL` });
//       batchResults.push({ ...business, facebook: '', yelp: '', email: '' });
//       continue;
//     }

//     pagePromises.push((async () => {
//       const page = await context.newPage();
//       try {
//         const links = await extractLinks(page, site, !!booking);
//         return {
//           index: i - startIdx,
//           data: { ...business, facebook: links.facebook, yelp: links.yelp, email: links.email }
//         };
//       } catch {
//         return {
//           index: i - startIdx,
//           data: { ...business, facebook: '', yelp: '', email: '' }
//         };
//       } finally {
//         await page.close();
//         progressBar.update(idx);
//       }
//     })());
//   }

//   const results = await Promise.all(pagePromises);
//   await context.close();

//   results.forEach(result => {
//     if (result && result.data) {
//       batchResults[result.index] = result.data;
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
//       linewrap: false
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

//     const facebookRecords = enriched.filter(r => !r.email || r.email.startsWith('http'));
//     const facebookResults = await facebookProcessor.processFacebookLinks(facebookRecords);
//     const merged = [...enriched];

//     facebookResults.forEach(fb => {
//       const existing = merged.find(r => r.Website === fb.Website);
//       if (existing) existing.email = fb.email || existing.email;
//       else merged.push(fb);
//     });

//     const groupedByState = merged.reduce((acc, item) => {
//       const state = item.state?.trim() || 'Unknown';
//       if (!acc[state]) acc[state] = [];
//       acc[state].push(item);
//       return acc;
//     }, {});

//     const workbook = new ExcelJS.Workbook();

//     for (const [state, records] of Object.entries(groupedByState)) {
//       const sheet = workbook.addWorksheet(state.substring(0, 31)); // Excel max sheet name length is 31

//       const headers = [
//         ...Object.keys(records[0]).filter(k => !['email', 'facebook'].includes(k)).map(id => ({ header: id, key: id })),
//         { header: 'Email', key: 'email' },
//         { header: 'Facebook', key: 'facebook' },
//       ];

//       sheet.columns = headers;
//       sheet.addRows(records.map(row => {
//         if (row.email?.startsWith('http')) row.email = '';
//         return row;
//       }));
//     }

//     await workbook.xlsx.writeFile(OUTPUT_XLSX);
//     console.log(`\n✅ Successfully written to: ${OUTPUT_XLSX}`);
//   } catch (err) {
//     console.error('❌ Fatal error:', err.message);
//   }
// };

// if (import.meta.url === `file://${process.argv[1]}`) {
//   enrichBusinesses();
// }

// export { enrichBusinesses };
// enrichBusinesses.js
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

// const readCSV = (filePath) => {
//   return new Promise((resolve, reject) => {
//     if (!fs.existsSync(filePath)) return reject(new Error(`Input file not found: ${filePath}`));

//     const results = [];
//     fs.createReadStream(filePath)
//       .pipe(csv())
//       .on('data', (data) => {
//         if (data && Object.keys(data).length > 0) {
//           const name = data.Name || data.name || data.NAME || '';
//           if (name) {
//             results.push({
//               ...data,
//               Name: name,
//               Website: data.Website || data.website || '',
//               state: data.state || data.State || 'Unknown'
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

//     return {
//       facebook: match('facebook'),
//       yelp: match('yelp.com'),
//       email: extractEmail() || match('contact', true) || match('email', true),
//     };
//   } catch (err) {
//     return { facebook: '', yelp: '', email: '' };
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
//       progressBar.update(idx, { status: `⏭ Skipping invalid business` });
//       batchResults.push(null);
//       continue;
//     }

//     const { Name, Website, booking } = business;
//     const site = Website?.trim();

//     if (!site?.startsWith('http')) {
//       progressBar.update(idx, { status: `⏭ Skipping ${Name} - Invalid URL` });
//       batchResults.push({ ...business, facebook: '', yelp: '', email: '' });
//       continue;
//     }

//     let validUrl;
//     try {
//       validUrl = new URL(site);
//     } catch {
//       progressBar.update(idx, { status: `⏭ Skipping ${Name} - Malformed URL` });
//       batchResults.push({ ...business, facebook: '', yelp: '', email: '' });
//       continue;
//     }

//     pagePromises.push((async () => {
//       const page = await context.newPage();
//       try {
//         const links = await extractLinks(page, site, !!booking);
//         return {
//           index: i - startIdx,
//           data: { ...business, facebook: links.facebook, yelp: links.yelp, email: links.email }
//         };
//       } catch {
//         return {
//           index: i - startIdx,
//           data: { ...business, facebook: '', yelp: '', email: '' }
//         };
//       } finally {
//         await page.close();
//         progressBar.update(idx);
//       }
//     })());
//   }

//   const results = await Promise.all(pagePromises);
//   await context.close();

//   results.forEach(result => {
//     if (result && result.data) {
//       batchResults[result.index] = result.data;
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
//       linewrap: false
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

//     const facebookRecords = enriched.filter(r => !r.email || r.email.startsWith('http'));
//     const facebookResults = await facebookProcessor.processFacebookLinks(facebookRecords);
//     const merged = [...enriched];

//     facebookResults.forEach(fb => {
//       const existing = merged.find(r => r.Website === fb.Website);
//       if (existing) existing.email = fb.email || existing.email;
//       else merged.push(fb);
//     });

//     const groupedByState = merged.reduce((acc, item) => {
//       const state = item.state?.trim() || 'Unknown';
//       if (!acc[state]) acc[state] = [];
//       acc[state].push(item);
//       return acc;
//     }, {});

//     const workbook = new ExcelJS.Workbook();

//     for (const [state, records] of Object.entries(groupedByState)) {
//       const sheet = workbook.addWorksheet(state.substring(0, 31));

//       const seen = new Set();
//       const headers = [
//         ...Object.keys(records[0])
//           .filter(key => {
//             if (seen.has(key)) return false;
//             seen.add(key);
//             return true;
//           })
//           .filter(k => !['email', 'facebook'].includes(k))
//           .map(id => ({ header: id, key: id })),
//         { header: 'Email', key: 'email' },
//         { header: 'Facebook', key: 'facebook' },
//       ];

//       sheet.columns = headers;
//       sheet.addRows(records.map(row => {
//         if (row.email?.startsWith('http')) row.email = '';
//         return row;
//       }));
//     }

//     await workbook.xlsx.writeFile(OUTPUT_XLSX);
//     console.log(`\n✅ Successfully written to: ${OUTPUT_XLSX}`);
//   } catch (err) {
//     console.error('❌ Fatal error:', err.message);
//   }
// };

// if (import.meta.url === `file://${process.argv[1]}`) {
//   enrichBusinesses();
// }

// export { enrichBusinesses };
// enrichBusinesses.js
// updated enrichBusinesses.js
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
const getDateString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const OUTPUT_XLSX = path.join(__dirname, '..', 'src', 'outputs', `enrichedBusinessLeads_${getDateString()}.xlsx`);
const BATCH_SIZE = 5;

const extractCityState = (address) => {
  if (typeof address !== 'string') return { city: 'Unknown', state: 'Unknown' };

  const parts = address.split(',').map(p => p.trim());
  const len = parts.length;

  let city = 'Unknown';
  let state = 'Unknown';

  if (len >= 3) {
    // Get city from 3rd last part
    const cityParts = parts[len - 3].split(' ');
    city = cityParts[cityParts.length - 1]; // last word (e.g., "Dothan")

    // Get state from 2nd last part (e.g., "AL 36301")
    const stateParts = parts[len - 2].split(' ');
    state = stateParts[0]; // just "AL"
  }

  return { city, state };
};

const readCSV = (filePath) => {
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
              //state: data.state || data.State || 'Unknown'
              // state,
              // city
            });
          }
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const extractLinks = async (page, url, skipBooking = false) => {
  try {
    await page.goto(url, { timeout: 20000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const links = await page.$$eval('a', (as) =>
      as.map((a) => ({ href: a.href, text: a.innerText?.toLowerCase().trim() || '' }))
    );

    const isSocial = (href) => href.includes('mailto:') || href.includes('facebook.com');

    const match = (keyword, excludeSocial = false) =>
      links.find((l) =>
        (l.href.toLowerCase().includes(keyword) || l.text.includes(keyword)) &&
        (!excludeSocial || !isSocial(l.href))
      )?.href || '';

    const extractEmail = () => {
      const mailtoLink = links.find((l) => l.href.toLowerCase().startsWith('mailto:'));
      return mailtoLink ? mailtoLink.href.replace('mailto:', '').trim() : '';
    };

    return {
      facebook: match('facebook'),
      email: extractEmail() || match('contact', true) || match('email', true),
    };
  } catch (err) {
    return { facebook: '', email: '' };
  }
};

const processBatch = async (browser, businesses, startIdx, endIdx, progressBar) => {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
  });

  const batchResults = [];
  const pagePromises = [];

  for (let i = startIdx; i < endIdx; i++) {
    const business = businesses[i];
    const idx = i + 1;

    if (!business || !business.Name) {
      progressBar.increment({ status: `⏭ Skipping invalid business` });
      batchResults.push(null);
      continue;
    }

    const { Name, Website, booking } = business;
    const site = Website?.trim();

    if (!site?.startsWith('http')) {
      progressBar.increment({ status: `⏭ Skipping ${Name} - Invalid URL` });
      batchResults.push({ ...business, facebook: '', email: '' });
      continue;
    }

    let validUrl;
    try {
      validUrl = new URL(site);
    } catch {
      progressBar.increment({ status: `⏭ Skipping ${Name} - Malformed URL` });
      batchResults.push({ ...business, facebook: '', email: '' });
      continue;
    }

    pagePromises.push((async () => {
      const page = await context.newPage();
      try {
        const links = await extractLinks(page, site, !!booking);
        return {
          index: i - startIdx,
          data: { ...business, facebook: links.facebook, email: links.email }
        };
      } catch {
        return {
          index: i - startIdx,
          data: { ...business, facebook: '', email: '' }
        };
      } finally {
        await page.close();
      }
    })());
  }

  const results = await Promise.all(pagePromises);
  await context.close();

  results.forEach(result => {
    const name = result?.data?.Name || 'Unknown';
    if (result && result.data) {
      batchResults[result.index] = result.data;
      const shortStatus = `✔ Processed ${name}`.substring(0, 50); // limit to 50 chars
      progressBar.increment({ status: shortStatus });
    } else {
      progressBar.increment({ status: `❌ Failed ${name}` });
    }
  });

  return batchResults.filter(Boolean);
};

const enrichBusinesses = async () => {
  try {
    console.log('🚀 Starting social link extraction');
    const businesses = await readCSV(INPUT_CSV);
    if (!businesses.length) throw new Error('No businesses found');

    const browser = await chromium.launch({ headless: true, timeout: 60000 });
    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% || {value}/{total} businesses | {status}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      linewrap: false,
      fps: 5
    });
    progressBar.start(businesses.length, 0, { status: '' });

    const enriched = [];
    for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, businesses.length);
      const batchResults = await processBatch(browser, businesses, i, batchEnd, progressBar);
      enriched.push(...batchResults);
    }
    progressBar.stop();
    await browser.close();

    const facebookRecords = enriched.filter(r => !r.email || r.email.startsWith('http'));
    const facebookResults = await facebookProcessor.processFacebookLinks(facebookRecords);
    const merged = [...enriched];

    facebookResults.forEach(fb => {
      const existing = merged.find(r => r.Website === fb.Website);
      if (existing) existing.email = fb.email || existing.email;
      else merged.push(fb);
    });

    const groupedByLocation = merged.reduce((acc, item) => {
      const key = `${item.state}-${item.city}`.substring(0, 31);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(OUTPUT_XLSX)) {
      await workbook.xlsx.readFile(OUTPUT_XLSX);
    }

    for (const [state, records] of Object.entries(groupedByLocation)) {
      const sheet = workbook.addWorksheet(state.substring(0, 31)); // Excel max sheet name length is 31

      const seen = new Set();

      const headers = [
        ...Object.keys(records[0])
          .filter(k => {
            if (seen.has(k)) return false;
            seen.add(k);
            return !['email', 'facebook'].includes(k); // manually add these below
          })
          .map(k => ({ header: k, key: k })),
        { header: 'Email', key: 'email' },
        { header: 'Facebook', key: 'facebook' }
      ];


      sheet.columns = headers;
      sheet.addRows(records.map(row => {
        if (row.email?.startsWith('http')) row.email = '';
        return row;
      }));
    }

    await workbook.xlsx.writeFile(OUTPUT_XLSX);
    console.log(`\n✅ Successfully written to: ${OUTPUT_XLSX}`);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  enrichBusinesses();
}

export { enrichBusinesses };