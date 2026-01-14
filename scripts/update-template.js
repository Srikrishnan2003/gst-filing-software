/**
 * Script to update GST Template with CGST/SGST sync formulas
 * Run with: node scripts/update-template.js
 */

const XLSX = require('xlsx-js-style');
const path = require('path');

const templatePath = path.join(__dirname, '../public/GST_Template.xlsx');
const outputPath = templatePath;

// Read existing workbook with styles
const workbook = XLSX.readFile(templatePath, { cellStyles: true });

// Column mapping
const CGST_PERCENT_COL = 'L';  // CGST %
const SGST_PERCENT_COL = 'N';  // SGST %
const START_ROW = 2;
const END_ROW = 500;

// Get the main sheet
const sheetName = 'Invoices for GSTR1';
const sheet = workbook.Sheets[sheetName];

if (!sheet) {
    console.error('Sheet "Invoices for GSTR1" not found!');
    process.exit(1);
}

console.log('Adding CGST/SGST sync formulas while preserving styles...');

// Add formulas to sync CGST% and SGST%
for (let row = START_ROW; row <= END_ROW; row++) {
    const sgstCell = `${SGST_PERCENT_COL}${row}`;

    // Get existing style from the cell (or use default)
    const existingCell = sheet[sgstCell];
    const existingStyle = existingCell ? existingCell.s : undefined;

    // SGST% = CGST% (simple formula that copies the value)
    // PRESERVE the existing style!
    sheet[sgstCell] = {
        f: `${CGST_PERCENT_COL}${row}`,
        t: 'n'
    };

    // Only add style if it existed
    if (existingStyle) {
        sheet[sgstCell].s = existingStyle;
    }
}

// Update the sheet range
sheet['!ref'] = `A1:U${END_ROW}`;

// Write the updated workbook with styles preserved
XLSX.writeFile(workbook, outputPath, { cellStyles: true });

console.log('Template updated successfully!');
console.log('SGST% column now automatically copies from CGST%');
console.log('Cell styles and formatting have been preserved.');

