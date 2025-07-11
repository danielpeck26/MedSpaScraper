const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');
const CONFIG = {
    csvPath: path.join(__dirname, 'outputs', 'enriched-with-social.csv'),    
    resultsPath: path.join(__dirname, 'outputs', 'scraping-results.json'),
    excelPath: path.join(__dirname, 'outputs', 'enriched-beach-boat-rentals.xlsx'),
}
function getTimestamp() {
    return new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
}
// Function to save results to Excel
function saveResultsToExcel() {
    let workbook;
    const filePath = CONFIG.excelPath;
    const runTimestamp = getTimestamp();
    const dataPath = CONFIG.resultsPath; // <-- wherever your JSON file is stored

    let data;
    try {
        const raw = fs.readFileSync(dataPath, 'utf-8');
        data = JSON.parse(raw);
    } catch (err) {
        console.error("Failed to read or parse JSON data.", err);
        return;
    }
    // Load existing file or create new workbook
    if (fs.existsSync(filePath)) {
        try {
            workbook = XLSX.readFile(filePath);
        } catch (e) {
            console.error("Failed to read Excel file. Creating new workbook.", e);
            workbook = XLSX.utils.book_new();
        }
    } else {
        workbook = XLSX.utils.book_new();
    }

    // Create sanitized sheet name
    let sheetName = `Run ${runTimestamp}`;
    sheetName = sheetName.substring(0, 31).replace(/[\\/?*[\]:]/g, '');

    if (workbook.SheetNames.includes(sheetName)) {
        // If sheet exists, append new data
        const existingSheet = workbook.Sheets[sheetName];
        const existingData = XLSX.utils.sheet_to_json(existingSheet);

        // Merge old + new data
        const combinedData = existingData.concat(data);

        // Convert merged data back to sheet
        const updatedSheet = XLSX.utils.json_to_sheet(combinedData);
        workbook.Sheets[sheetName] = updatedSheet;
    } else {
        // Create new sheet from data
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    // Save updated workbook
    XLSX.writeFile(workbook, filePath, { bookType: 'xlsx', compression: true });
}
if (require.main === module) {
    saveResultsToExcel();
    console.log("Results have been saved to Excel.");
}