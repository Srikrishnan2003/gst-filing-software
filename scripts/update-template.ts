/**
 * Script to update GST Template with CGST/SGST sync formulas
 * Run with: npx ts-node scripts/update-template.ts
 */

import * as XLSX from 'xlsx-js-style';
import * as path from 'path';
import * as fs from 'fs';

const templatePath = path.join(__dirname, '../public/GST_Template.xlsx');
const outputPath = templatePath; // Overwrite

// Read existing workbook
const workbook = XLSX.readFile(templatePath);

// Column mapping (1-indexed for Excel reference)
// A=1, B=2, ... L=12(CGST%), M=13(CGST Amt), N=14(SGST%), O=15(SGST Amt)
const CGST_PERCENT_COL = 'L';  // CGST %
const SGST_PERCENT_COL = 'N';  // SGST %
const START_ROW = 2; // Data starts from row 2 (row 1 is header)
const END_ROW = 1000; // Support up to 1000 rows

// Get the main sheet
const sheetName = 'Invoices for GSTR1';
const sheet = workbook.Sheets[sheetName];

if (!sheet) {
    console.error(`Sheet "${sheetName}" not found!`);
    process.exit(1);
}

// Add formulas to sync CGST% and SGST%
// SGST% = CGST% if SGST% is empty
// We'll use a formula that shows CGST% value but allows override
for (let row = START_ROW; row <= END_ROW; row++) {
    const cgstCell = `${CGST_PERCENT_COL}${row}`;
    const sgstCell = `${SGST_PERCENT_COL}${row}`;

    // For SGST%, use formula: =IF(L{row}<>"", L{row}, "")
    // This copies CGST% to SGST% but user can override by typing directly
    if (!sheet[sgstCell] || !sheet[sgstCell].v) {
        sheet[sgstCell] = {
            f: `IF(${CGST_PERCENT_COL}${row}<>"",${CGST_PERCENT_COL}${row},"")`,
            t: 'n'
        };
    }

    // For CGST%, similarly reference SGST% if CGST% is empty
    if (!sheet[cgstCell] || !sheet[cgstCell].v) {
        sheet[cgstCell] = {
            f: `IF(${SGST_PERCENT_COL}${row}<>"",${SGST_PERCENT_COL}${row},"")`,
            t: 'n'
        };
    }
}

// Update the sheet range to include all rows
sheet['!ref'] = `A1:U${END_ROW}`;

// Write the updated workbook
XLSX.writeFile(workbook, outputPath);

console.log(`Template updated successfully at: ${outputPath}`);
console.log('SGST% will now automatically sync with CGST% and vice versa.');
