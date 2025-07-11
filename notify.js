import notifier from 'node-notifier';
import { exec } from 'child_process';

notifier.notify({
  title: '🔔 Sample Notification',
  message: 'This is a test from MedSpa Scraper!',
  sound: true
});
exec('PowerShell -Command "Add-Type –AssemblyName System.Speech; ' +
    '(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\'Scraping is complete\')"');