import fs from 'fs';
import { createObjectCsvWriter } from 'csv-writer';

export async function writeToCsv(filePath, data) {
  if (data.length === 0) return;

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'name', title: 'Name' },
      { id: 'rating', title: 'Rating' },
      { id: 'review', title: 'Review' },
      { id: 'address', title: 'Address' },
      { id: 'state', title: 'State' },
      { id: 'phone', title: 'Phone' },      
      { id: 'website', title: 'Website' },      
      //{ id: 'bookingLink', title: 'Booking Link' }
    ],
    encoding: 'utf8'
  });

  // Add BOM to file manually
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '\uFEFF', { encoding: 'utf8' });
  }

  await csvWriter.writeRecords(data);
}
