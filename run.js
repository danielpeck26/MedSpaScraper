import { scrapeGoogleMaps } from './src/google-maps-scraper.js';
import { enrichBusinesses } from './src/website-enricher.js';
import notifier from 'node-notifier';
import { exec, spawn } from 'child_process';

import os from 'os';
import path from 'path';

const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

const searchQuery = process.argv.length > 2 ? process.argv.slice(2).join(" ") : "";

async function cleanupResources() {
  console.log('🧹 Cleaning up previous resources...');

  if (isWindows) {
    exec('taskkill /F /IM chromium.exe /T', (err) => {
      if (err) console.warn('⚠️ Chromium termination failed:', err.message);
    });
  } else if (isLinux) {
    exec('pkill -f chromium', (err) => {
      if (err) console.warn('⚠️ Chromium kill failed or not running:', err.message);
    });

    // Optional: Clear memory cache (requires sudo)
    exec('sync; echo 3 | sudo tee /proc/sys/vm/drop_caches', (err, stdout, stderr) => {
      if (err) {
        console.warn('⚠️ Could not drop caches. Try running with sudo.');
      } else {
        console.log('🧠 Memory caches dropped');
      }
    });
  }

  // Wait briefly before continuing (in ms)
  await new Promise(resolve => setTimeout(resolve, 2000));
}

(async () => {
  try {    
    await cleanupResources();
    console.log(`🚀 Running scrapeGoogleMaps with Search Query: ${searchQuery}`);

    // Prevent sleep (Windows only)
    if (isWindows) {
      exec('powercfg -change -standby-timeout-ac 0');
    }

    // 🗺️ Scraping Phase
    console.log('📍 Starting Google Maps scraping...');
    await scrapeGoogleMaps(searchQuery);

    // 🌐 Enrichment Phase
    console.log('🌐 Enriching website data with social info...');
    await enrichBusinesses();

    // ✅ Notification (cross-platform)
    if (isWindows) {
      notifier.notify({
        title: '✅ MedSpa Scraper',
        message: 'Scraping completed successfully!',
        sound: true
      });
    } else if (isLinux) {
      exec(`notify-send "✅ MedSpa Scraper" "Scraping completed successfully!"`);
    }

    // 🔊 Voice Output
    if (isWindows) {
      exec('PowerShell -Command "Add-Type –AssemblyName System.Speech; ' +
        '(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\'MedSpa scraping is complete\')"');
    } else if (isLinux) {
      exec(`which espeak >/dev/null 2>&1 && espeak "MedSpa scraping is complete" || spd-say "MedSpa scraping is complete"`);
    }

    console.log(`✅ All done! Check your output directory for results.`);

    // ♻️ Restore power settings (Windows only)
    if (isWindows) {
      exec('powercfg -change -standby-timeout-ac 30');
    }

  } catch (err) {
    console.error("❌ Execution error:", err);
    process.exit(1);
  }
})();
