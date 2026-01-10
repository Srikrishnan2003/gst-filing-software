/**
 * GST Offline Tool CSV Export
 * Exports invoice data in CSV format for GST Offline Tool import
 */

import { type B2BInvoice } from "@/lib/schemas/gst-schema";
import { getHSNDescription } from "@/lib/data/hsn-master";

// Official GST Offline Tool B2B sheet columns
const B2B_HEADERS = [
    "GSTIN/UIN of Recipient",
    "Receiver Name",
    "Invoice Number",
    "Invoice date",
    "Invoice Value",
    "Place Of Supply",
    "Reverse Charge",
    "Applicable % of Tax Rate",
    "Invoice Type",
    "E-Commerce GSTIN",
    "Rate",
    "Taxable Value",
    "Cess Amount"
];

// Official GST Offline Tool HSN B2B sheet columns
const HSN_HEADERS = [
    "HSN",
    "Description",
    "UQC",
    "Total Quantity",
    "Total Value",
    "Rate",
    "Taxable Value",
    "Integrated Tax Amount",
    "Central Tax Amount",
    "State/UT Tax Amount",
    "Cess Amount"
];

/**
 * Export invoices to GST Offline Tool compatible CSV format
 * Generates and downloads CSV files for B2B and HSN data
 */
export async function exportToGSTOfflineTool(
    invoices: B2BInvoice[],
    gstin: string = "",
    filingPeriod: string = ""
): Promise<void> {
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const prefix = `GSTR1_${gstin || "EXPORT"}_${filingPeriod || dateStr}`;

    // Generate and download B2B CSV
    const b2bCSV = generateB2BCSV(invoices);
    downloadCSV(b2bCSV, `${prefix}_B2B.csv`);

    // Generate and download HSN CSV
    const hsnCSV = generateHSNCSV(invoices);
    downloadCSV(hsnCSV, `${prefix}_HSN.csv`);
}

/**
 * Download CSV content as a file
 */
function downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSV(value: any): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Convert date from DD-MM-YYYY to dd-mmm-yyyy format
 * GST Offline Tool requires: 26-Dec-2025 (not 26-12-2025)
 */
function convertDateFormat(dateStr: string): string {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Try to parse DD-MM-YYYY format
    const parts = dateStr.split("-");
    if (parts.length === 3) {
        const day = parts[0].padStart(2, "0");
        const monthNum = parseInt(parts[1], 10);
        const year = parts[2];

        if (monthNum >= 1 && monthNum <= 12) {
            return `${day}-${months[monthNum - 1]}-${year}`;
        }
    }

    // Return original if can't parse
    return dateStr;
}

/**
 * Generate B2B CSV content in official GST Offline Tool format
 */
function generateB2BCSV(invoices: B2BInvoice[]): string {
    const rows: string[] = [];

    // Header row
    rows.push(B2B_HEADERS.map(escapeCSV).join(","));

    // Data rows - one row per invoice item
    invoices.forEach(invoice => {
        invoice.items.forEach(item => {
            // Determine Place of Supply with state code format
            const posCode = invoice.placeOfSupply.padStart(2, "0");
            const posName = getStateNameFromCode(posCode);
            const placeOfSupply = `${posCode}-${posName}`;

            // Convert date to GST format (dd-mmm-yyyy)
            const formattedDate = convertDateFormat(invoice.invoiceDate);

            const row = [
                invoice.gstin,                           // GSTIN/UIN of Recipient
                invoice.receiverName || "",              // Receiver Name
                invoice.invoiceNumber,                   // Invoice Number
                formattedDate,                           // Invoice date (dd-mmm-yyyy)
                invoice.invoiceValue,                    // Invoice Value
                placeOfSupply,                           // Place Of Supply
                invoice.reverseCharge,                   // Reverse Charge (Y/N)
                "",                                      // Applicable % of Tax Rate (blank)
                "R",                                     // Invoice Type (R=Regular)
                "",                                      // E-Commerce GSTIN (blank)
                item.rate,                               // Rate
                item.taxableValue,                       // Taxable Value
                item.cessAmount                          // Cess Amount
            ];

            rows.push(row.map(escapeCSV).join(","));
        });
    });

    return rows.join("\n");
}

/**
 * Generate HSN CSV content in official GST Offline Tool format
 */
function generateHSNCSV(invoices: B2BInvoice[]): string {
    const rows: string[] = [];

    // Build HSN summary by grouping items
    const hsnMap = new Map<string, {
        hsn: string;
        desc: string;
        uqc: string;
        qty: number;
        totalValue: number;
        rate: number;
        txval: number;
        iamt: number;
        camt: number;
        samt: number;
        csamt: number;
    }>();

    invoices.forEach(inv => {
        inv.items.forEach(item => {
            const key = `${item.hsnCode || "NA"}_${item.rate}`;

            if (!hsnMap.has(key)) {
                hsnMap.set(key, {
                    hsn: item.hsnCode || "NA",
                    desc: getHSNDescription(item.hsnCode),
                    uqc: item.unit || "NA",
                    qty: 0,
                    totalValue: 0,
                    rate: item.rate,
                    txval: 0,
                    iamt: 0,
                    camt: 0,
                    samt: 0,
                    csamt: 0
                });
            }

            const entry = hsnMap.get(key)!;
            entry.qty += item.quantity || 0;
            entry.totalValue += item.taxableValue + item.igstAmount + item.cgstAmount + item.sgstAmount + item.cessAmount;
            entry.txval += item.taxableValue;
            entry.iamt += item.igstAmount;
            entry.camt += item.cgstAmount;
            entry.samt += item.sgstAmount;
            entry.csamt += item.cessAmount;
        });
    });

    // Header row
    rows.push(HSN_HEADERS.map(escapeCSV).join(","));

    // Data rows
    hsnMap.forEach(entry => {
        const row = [
            entry.hsn,
            entry.desc,
            entry.uqc,
            entry.qty,
            entry.totalValue.toFixed(2),
            entry.rate,
            entry.txval.toFixed(2),
            entry.iamt.toFixed(2),
            entry.camt.toFixed(2),
            entry.samt.toFixed(2),
            entry.csamt.toFixed(2)
        ];
        rows.push(row.map(escapeCSV).join(","));
    });

    return rows.join("\n");
}

/**
 * Get state name from GST state code
 */
function getStateNameFromCode(code: string): string {
    const stateMap: Record<string, string> = {
        "01": "Jammu and Kashmir",
        "02": "Himachal Pradesh",
        "03": "Punjab",
        "04": "Chandigarh",
        "05": "Uttarakhand",
        "06": "Haryana",
        "07": "Delhi",
        "08": "Rajasthan",
        "09": "Uttar Pradesh",
        "10": "Bihar",
        "11": "Sikkim",
        "12": "Arunachal Pradesh",
        "13": "Nagaland",
        "14": "Manipur",
        "15": "Mizoram",
        "16": "Tripura",
        "17": "Meghalaya",
        "18": "Assam",
        "19": "West Bengal",
        "20": "Jharkhand",
        "21": "Odisha",
        "22": "Chhattisgarh",
        "23": "Madhya Pradesh",
        "24": "Gujarat",
        "25": "Daman and Diu",
        "26": "Dadra and Nagar Haveli",
        "27": "Maharashtra",
        "28": "Andhra Pradesh",
        "29": "Karnataka",
        "30": "Goa",
        "31": "Lakshadweep",
        "32": "Kerala",
        "33": "Tamil Nadu",
        "34": "Puducherry",
        "35": "Andaman and Nicobar Islands",
        "36": "Telangana",
        "37": "Andhra Pradesh (New)",
        "38": "Ladakh",
        "97": "Other Territory",
        "99": "Centre Jurisdiction"
    };
    return stateMap[code] || "Other";
}

