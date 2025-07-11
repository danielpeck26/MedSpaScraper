import { scrapeGoogleMaps } from './src/google-maps-scraper.js';
import { enrichBusinesses } from './src/website-enricher.js';
import notifier from 'node-notifier';
import { exec } from 'child_process';
import cliProgress from 'cli-progress';
import axios from 'axios';

// 💤 Prevent sleep on AC power
exec('powercfg -change -standby-timeout-ac 0');

// 🟡 Read search query from CLI or fallback
const searchQuery = process.argv.length > 2 ? process.argv.slice(2).join(" ") : "";

(async () => {
  try {
    console.log(`🚀 Running scrapeGoogleMaps with Search Query: ${searchQuery}`);
    
    // Scraping Phase
    console.log('📍 Starting Google Maps scraping...');
    
    await scrapeGoogleMaps(searchQuery);
    // Enrichment Phase
    console.log('🌐 Enriching website data with social info...');
    
    await enrichBusinesses();
    // ✅ System notification
    notifier.notify({
      title: '✅ MedSpa Scraper',
      message: 'Scraping completed successfully!',
      sound: true
    });

    // 🔊 Optional voice output
    exec('PowerShell -Command "Add-Type –AssemblyName System.Speech; ' +
         '(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\'MedSpa scraping is complete\')"' );

    console.log(`✅ All done! Check your output directory for results.`);
    
    // ♻️ Reset power settings
    exec('powercfg -change -standby-timeout-ac 30');

  } catch (err) {
    console.error("❌ Execution error:", err);
    process.exit(1);
  }
})();
