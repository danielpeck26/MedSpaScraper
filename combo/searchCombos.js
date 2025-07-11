import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '..', 'config.json');

const config = JSON.parse(readFileSync(configPath, 'utf-8'));

const businessKeywords = [
  "Med Spa", "Medi Spa", "Medical Spa", "Aesthetic Clinic", "Botox Clinic",
  "Facial Spa", "Laser Skin Clinic", "Skin Rejuvenation", "Laser Hair Removal"
];

const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

function generateSearchCombos(input) {
  const combos = [];
  const inputLower = input.toLowerCase();

  if (inputLower === 'all') {
    for (const state of usStates) {
      for (const keyword of businessKeywords) {
        combos.push(`${keyword} in ${state}`);
      }
    }
  } else if (usStates.map(s => s.toLowerCase()).includes(inputLower)) {
    const stateFormatted = usStates.find(s => s.toLowerCase() === inputLower);
    for (const keyword of businessKeywords) {
      combos.push(`${keyword} in ${stateFormatted}`);
    }
  } else if (businessKeywords.map(k => k.toLowerCase()).includes(inputLower)) {
    const keywordFormatted = businessKeywords.find(k => k.toLowerCase() === inputLower);
    for (const state of usStates) {
      combos.push(`${keywordFormatted} in ${state}`);
    }
  } else {
    combos.push(input); // fallback
  }

  return combos;
}

export function getSearchCombosFromConfig() {
  const input = config.googleMapsScraper.defaultSearchQuery;
  return generateSearchCombos(input);
}
