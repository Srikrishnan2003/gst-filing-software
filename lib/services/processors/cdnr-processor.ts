import {
    CDNRRowSchema,
    type CDNRRow,
    type CDNRInvoice,
} from "@/lib/schemas/cdnr-schema";
import { type ErrorRow, type ValidationResult } from "@/lib/schemas/gst-schema";
import * as XLSX from "xlsx";

const MONTH_MAP: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
};

// Pure logic: Convert Excel Serial Date to JS Date
function excelSerialDateToJSDate(serial: number): Date | null {
    if (serial <= 0) return null;
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400 * 1000;
    return new Date(utc_value);
}

function excelDateToString(excelDate: number | string | Date): string {
    if (!excelDate) return "";

    // Handle Date Object
    if (excelDate instanceof Date) {
        const day = String(excelDate.getDate()).padStart(2, "0");
        const month = String(excelDate.getMonth() + 1).padStart(2, "0");
        const year = excelDate.getFullYear();
        return `${day}-${month}-${year}`;
    }

    // Handle Number (Excel Serial)
    if (typeof excelDate === "number") {
        let dateObj: Date | null = null;
        try {
            const ssfDate = XLSX.SSF.parse_date_code(excelDate);
            if (ssfDate) {
                return `${String(ssfDate.d).padStart(2, "0")}-${String(ssfDate.m).padStart(2, "0")}-${ssfDate.y}`;
            }
        } catch (e) {
            dateObj = excelSerialDateToJSDate(excelDate);
        }
        if (!dateObj) dateObj = excelSerialDateToJSDate(excelDate);
        if (dateObj && !isNaN(dateObj.getTime())) {
            const day = String(dateObj.getUTCDate()).padStart(2, "0");
            const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
            const year = dateObj.getUTCFullYear();
            return `${day}-${month}-${year}`;
        }
        return "";
    }

    // Handle String
    let str = String(excelDate).trim();
    if (!str) return "";
    str = str.replace(/[,/.]/g, "-");
    const parts = str.split("-");

    if (parts.length === 3) {
        let [p1, p2, p3] = parts;
        if (/[a-zA-Z]/.test(p2)) {
            const m = p2.toLowerCase().slice(0, 3);
            if (MONTH_MAP[m]) p2 = MONTH_MAP[m];
        } else if (/[a-zA-Z]/.test(p1)) {
            const m = p1.toLowerCase().slice(0, 3);
            if (MONTH_MAP[m]) { p1 = p2; p2 = MONTH_MAP[m]; }
        }
        if (p1.length === 4) return `${p3.padStart(2, "0")}-${p2.padStart(2, "0")}-${p1}`;
        return `${p1.padStart(2, "0")}-${p2.padStart(2, "0")}-${p3}`;
    }
    return str;
}

// Mappings specifically for Munim Sales Return Template
const CDNR_HEADER_MAPPINGS: Record<string, string> = {
    "gstin/uin of recipient": "gstin",
    "receiver name": "receiverName", // Not in schema but good to have?
    "invoice/advance receipt number": "originalInvoiceNumber",
    "invoice/advance receipt date": "originalInvoiceDate",
    "note/refund voucher number": "noteNumber",
    "note/refund voucher date": "noteDate",
    "document type": "noteType", // C/D
    "place of supply": "placeOfSupply",
    "note/refund voucher value": "noteValue",
    "applicable % of tax rate": "rate",
    "rate": "rate",
    "taxable value": "taxableValue",
    "cess amount": "cessAmount",
    "pre gst": "preGst",
    "integrated tax": "igstAmount",
    "central tax": "cgstAmount",
    "state/ut tax": "sgstAmount",
};

export function cleanCDNRRow(row: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
        if (value === undefined || value === null || value === "") continue;

        switch (key) {
            case "gstin": cleaned[key] = String(value).toUpperCase().trim(); break;
            case "noteNumber": case "originalInvoiceNumber":
                cleaned[key] = String(value).trim(); break;
            case "noteDate": case "originalInvoiceDate":
                cleaned[key] = excelDateToString(value as any); break;
            case "placeOfSupply":
                const posStr = String(value).trim();
                const match = posStr.match(/^(\d{2})/);
                cleaned[key] = match ? match[1] : posStr.padStart(2, "0").slice(0, 2);
                break;
            case "noteType":
                const type = String(value).toUpperCase().trim();
                // Map full words to C/D if necessary
                if (type.includes("CREDIT")) cleaned[key] = "C";
                else if (type.includes("DEBIT")) cleaned[key] = "D";
                else cleaned[key] = type.charAt(0);
                break;
            case "preGst":
                const pg = String(value).toUpperCase().trim();
                cleaned[key] = pg === "Y" || pg === "YES" ? "Y" : "N";
                break;
            case "noteValue": case "rate": case "taxableValue":
            case "igstAmount": case "cgstAmount": case "sgstAmount": case "cessAmount":
                const numVal = parseFloat(String(value).replace(/[₹,\s]/g, ""));
                cleaned[key] = isNaN(numVal) ? 0 : numVal;
                break;
            default: cleaned[key] = value;
        }
    }

    // Round rate to nearest standard GST rate (including 9% for CGST/SGST)
    if (cleaned["rate"] !== undefined) {
        const standardRates = [0, 5, 9, 12, 18, 28];
        const currentRate = cleaned["rate"] as number;
        const nearestRate = standardRates.reduce((a, b) =>
            Math.abs(b - currentRate) < Math.abs(a - currentRate) ? b : a
        );
        cleaned["rate"] = nearestRate;
    }

    return cleaned;
}

export function validateCDNRRows(rows: Record<string, unknown>[]): ValidationResult {
    const validRows: any[] = []; // CDNRRow is inferred
    const errorRows: ErrorRow[] = [];

    rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const cleanedRow = cleanCDNRRow(row);
        const result = CDNRRowSchema.safeParse(cleanedRow);

        if (result.success) {
            validRows.push(result.data);
        } else {
            const errors = result.error.errors.map((err) => {
                const field = err.path.join(".");
                return `Row ${rowNumber}: ${field} - ${err.message}`;
            });
            errorRows.push({ rowNumber, data: row, errors });
        }
    });

    // Cast as ValidationResult compatible object
    // Note: ValidationResult in gst-schema expects B2BInvoiceRow, so strict type checking might complain.
    // Ideally we should make ValidationResult generic. For now, we will return a structure that mimics it 
    // but the consumer (excel-processor) needs to handle the union type.
    return { validRows, errorRows };
}

export function groupCDNRInvoices(rows: CDNRRow[]): CDNRInvoice[] {
    const noteMap = new Map<string, CDNRInvoice>();

    rows.forEach((row) => {
        // Unique key for CDNR is Note Number (and GSTIN to be safe)
        const key = `${row.gstin}_${row.noteNumber}`;

        const item = {
            rate: row.rate,
            taxableValue: row.taxableValue,
            igstAmount: row.igstAmount,
            cgstAmount: row.cgstAmount,
            sgstAmount: row.sgstAmount,
            cessAmount: row.cessAmount
        };

        if (noteMap.has(key)) {
            const note = noteMap.get(key)!;
            note.items.push(item);

            note.totalTaxableValue += row.taxableValue;
            note.totalIgst += row.igstAmount;
            note.totalCgst += row.cgstAmount;
            note.totalSgst += row.sgstAmount;
            note.totalCess += row.cessAmount;
            note.totalTaxAmount = note.totalIgst + note.totalCgst + note.totalSgst + note.totalCess;
        } else {
            const totalTax = row.igstAmount + row.cgstAmount + row.sgstAmount + row.cessAmount;

            const note: CDNRInvoice = {
                id: `cdnr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                gstin: row.gstin,
                noteType: row.noteType,
                noteNumber: row.noteNumber,
                noteDate: row.noteDate,
                originalInvoiceNumber: row.originalInvoiceNumber,
                originalInvoiceDate: row.originalInvoiceDate,
                noteValue: row.noteValue,
                placeOfSupply: row.placeOfSupply,
                preGst: row.preGst,
                items: [item],
                totalTaxableValue: row.taxableValue,
                totalIgst: row.igstAmount,
                totalCgst: row.cgstAmount,
                totalSgst: row.sgstAmount,
                totalCess: row.cessAmount,
                totalTaxAmount: totalTax
            };
            noteMap.set(key, note);
        }
    });

    return Array.from(noteMap.values());
}

export const CDNR_PROCESSOR = {
    HEADER_MAPPINGS: CDNR_HEADER_MAPPINGS,
    cleanRow: cleanCDNRRow,
    validate: validateCDNRRows,
    group: groupCDNRInvoices
};
