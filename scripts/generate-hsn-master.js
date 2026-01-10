// Script to generate HSN Master Excel file with common HSN codes
// Run with: node scripts/generate-hsn-master.js

const XLSX = require('xlsx-js-style');
const path = require('path');
const fs = require('fs');

// Common HSN codes with descriptions (from GST portal)
const HSN_MASTER_DATA = [
    // Services - Chapter 99
    { hsn: "998717", desc: "Maintenance and repair services of commercial and industrial machinery", uqc: "NA" },
    { hsn: "998712", desc: "Maintenance and repair services of transport machinery and equipment", uqc: "NA" },
    { hsn: "998713", desc: "Maintenance and repair services of office machinery and equipment", uqc: "NA" },
    { hsn: "998714", desc: "Maintenance and repair services of electrical equipment", uqc: "NA" },
    { hsn: "998715", desc: "Maintenance and repair services of computer machinery and equipment", uqc: "NA" },
    { hsn: "998719", desc: "Maintenance and repair services of other goods n.e.c.", uqc: "NA" },
    { hsn: "9954", desc: "Construction services", uqc: "NA" },
    { hsn: "9971", desc: "Financial and related services", uqc: "NA" },
    { hsn: "9972", desc: "Real estate services", uqc: "NA" },
    { hsn: "9973", desc: "Leasing or rental services without operator", uqc: "NA" },
    { hsn: "9983", desc: "Other professional, technical and business services", uqc: "NA" },
    { hsn: "9985", desc: "Support services", uqc: "NA" },
    { hsn: "9986", desc: "Educational services", uqc: "NA" },
    { hsn: "9991", desc: "Public administration and other services provided to the community as a whole", uqc: "NA" },
    { hsn: "9992", desc: "Human health services", uqc: "NA" },
    { hsn: "9993", desc: "Social care services", uqc: "NA" },
    { hsn: "9994", desc: "Sewage and waste collection, treatment and disposal services", uqc: "NA" },
    { hsn: "9995", desc: "Services of membership organizations", uqc: "NA" },
    { hsn: "9996", desc: "Recreational, cultural and sporting services", uqc: "NA" },
    { hsn: "9997", desc: "Other services", uqc: "NA" },

    // Goods - Common chapters
    { hsn: "84834000", desc: "GEARS AND GEARING, OTHER THAN TOOTHED WHEELS, CHAIN SPROCKETS AND OTHER TRANSMISSION ELEMENTS PRESENTED SEPARATELY, BALL OR ROLLER SCREWS, GEAR BOXES AND OTHER SPEED CHANGERS, INCLUDING TORQUE CONVERTERS", uqc: "NOS" },
    { hsn: "84831010", desc: "TRANSMISSION SHAFTS INCLUDING CAM SHAFTS AND CRANK SHAFTS AND CRANKS - CRANK SHAFTS", uqc: "NOS" },
    { hsn: "84833000", desc: "BEARING HOUSINGS, NOT INCORPORATING BALL OR ROLLER BEARINGS; PLAIN SHAFT BEARINGS", uqc: "NOS" },
    { hsn: "84841000", desc: "GASKETS AND SIMILAR JOINTS OF METAL SHEETING COMBINED WITH OTHER MATERIAL OR OF TWO OR MORE LAYERS OF METAL", uqc: "NOS" },
    { hsn: "73181500", desc: "OTHER SCREWS AND BOLTS, WHETHER OR NOT WITH THEIR NUTS OR WASHERS - OTHER SCREWS", uqc: "NOS" },
    { hsn: "73181600", desc: "NUTS", uqc: "NOS" },
    { hsn: "73182100", desc: "SPRING WASHERS AND OTHER LOCK WASHERS", uqc: "NOS" },
    { hsn: "73182200", desc: "OTHER WASHERS", uqc: "NOS" },
    { hsn: "40169300", desc: "GASKETS, WASHERS AND OTHER SEALS OF VULCANISED RUBBER", uqc: "NOS" },
    { hsn: "84212100", desc: "FILTERING OR PURIFYING MACHINERY AND APPARATUS FOR LIQUIDS - FOR FILTERING OR PURIFYING WATER", uqc: "NOS" },
    { hsn: "84821090", desc: "BALL BEARINGS - OTHER", uqc: "NOS" },
    { hsn: "84822010", desc: "TAPERED ROLLER BEARINGS, INCLUDING CONE AND TAPERED ROLLER ASSEMBLIES", uqc: "NOS" },
    { hsn: "84823000", desc: "SPHERICAL ROLLER BEARINGS", uqc: "NOS" },
    { hsn: "84824000", desc: "NEEDLE ROLLER BEARINGS", uqc: "NOS" },
    { hsn: "84829900", desc: "OTHER PARTS OF BEARINGS", uqc: "NOS" },
    { hsn: "85044010", desc: "STATIC CONVERTERS - RECTIFIERS", uqc: "NOS" },
    { hsn: "85044090", desc: "STATIC CONVERTERS - OTHER", uqc: "NOS" },
    { hsn: "27101990", desc: "OTHER PETROLEUM OILS AND OILS OBTAINED FROM BITUMINOUS MINERALS", uqc: "LTR" },
    { hsn: "27101960", desc: "LUBRICATING OILS", uqc: "LTR" },
    { hsn: "27101940", desc: "LUBRICATING GREASES", uqc: "KGS" },
];

// Create workbook
const wb = XLSX.utils.book_new();

// Create HSN Master sheet
const hsnSheet = XLSX.utils.json_to_sheet(HSN_MASTER_DATA.map(item => ({
    'HSN Code': item.hsn,
    'Description': item.desc,
    'UQC': item.uqc
})));

// Set column widths
hsnSheet['!cols'] = [
    { width: 15 },  // HSN Code
    { width: 100 }, // Description
    { width: 10 },  // UQC
];

XLSX.utils.book_append_sheet(wb, hsnSheet, 'HSN Master');

// Write file
const outputPath = path.join(__dirname, '..', 'templates', 'gstr1_hsn_master.xlsx');

// Ensure templates directory exists
const templatesDir = path.dirname(outputPath);
if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
}

XLSX.writeFile(wb, outputPath);

console.log(`HSN Master Excel file created at: ${outputPath}`);
console.log(`Contains ${HSN_MASTER_DATA.length} HSN codes`);
