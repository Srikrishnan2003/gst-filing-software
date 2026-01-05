import {
    B2BInvoiceRowSchema,
    type B2BInvoiceRow,
    type B2BInvoice,
    type InvoiceItem,
    type ErrorRow,
    type ValidationResult,
} from "@/lib/schemas/gst-schema";



const MONTH_MAP: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
};

// Pure logic: Convert Excel Serial Date to JS Date
function excelSerialDateToJSDate(serial: number): Date | null {
    // Excel base date logic
    // 25569 = Days between 1900-01-01 and 1970-01-01 (Unix Epoch)
    // 86400 * 1000 = Milliseconds per day
    if (serial <= 0) return null;
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400 * 1000;
    const date_info = new Date(utc_value);

    // Adjust for timezone offset to keep it as local/naive date concept if needed
    // But GSTR1 usually expects just the date part. 
    // This simple conversion works for modern dates.
    // Correcting for the "Excel Leap Year Bug" (1900 wasn't leap year but Excel thinks it is)
    // Dates > Mar 1 1900 are fine for standard math relative to epoch. 
    // Nov 2025 is definitely > 1900.
    return date_info;
}

function excelDateToString(excelDate: number | string | Date): string {
    if (!excelDate) return "";

    // 1. Handle Date Object
    if (excelDate instanceof Date) {
        const day = String(excelDate.getDate()).padStart(2, "0");
        const month = String(excelDate.getMonth() + 1).padStart(2, "0");
        const year = excelDate.getFullYear();
        return `${day}-${month}-${year}`;
    }

    // 2. Handle Number (Excel Serial)
    if (typeof excelDate === "number") {
        // Use manual conversion
        let dateObj: Date | null = null;
        dateObj = excelSerialDateToJSDate(excelDate);

        if (!dateObj) dateObj = excelSerialDateToJSDate(excelDate);
        if (dateObj) {
            // Check for Invalid Date
            if (isNaN(dateObj.getTime())) return "";
            const day = String(dateObj.getUTCDate()).padStart(2, "0"); // Use UTC to avoid shift
            const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
            const year = dateObj.getUTCFullYear();
            return `${day}-${month}-${year}`;
        }
        return "";
    }

    // 3. Handle String
    let str = String(excelDate).trim();
    if (!str) return "";

    // Normalize separators
    str = str.replace(/[,/.]/g, "-");

    const parts = str.split("-");

    // Case A: 3 parts (Day-Month-Year or Year-Month-Day)
    if (parts.length === 3) {
        let [p1, p2, p3] = parts;

        // Handle Month Names (Nov -> 11)
        if (/[a-zA-Z]/.test(p2)) {
            const m = p2.toLowerCase().slice(0, 3);
            if (MONTH_MAP[m]) p2 = MONTH_MAP[m];
        } else if (/[a-zA-Z]/.test(p1)) {
            // Maybe Month-Day-Year? e.g. Nov-25-2025
            const m = p1.toLowerCase().slice(0, 3);
            if (MONTH_MAP[m]) {
                const temp = p1; p1 = p2; p2 = MONTH_MAP[m];
            }
        }

        // Detect YYYY-MM-DD
        if (p1.length === 4) {
            return `${p3.padStart(2, "0")}-${p2.padStart(2, "0")}-${p1}`;
        }

        // Handle 2-digit year (25 -> 2025)
        if (p3.length === 2) {
            const yearNum = parseInt(p3);
            p3 = (yearNum > 50 ? "19" : "20") + p3;
        }

        // Handle M/D/YYYY vs D/M/YYYY ambiguity
        // Excel typically outputs US format (M/D/Y), so we need to swap to DD-MM-YYYY
        const n1 = parseInt(p1);
        const n2 = parseInt(p2);

        // If first number > 12, it must be a day (already DD-MM-YYYY)
        if (n1 > 12) {
            return `${p1.padStart(2, "0")}-${p2.padStart(2, "0")}-${p3}`;
        }

        // If first number <= 12 and second <= 31, assume US format M/D/Y → swap to D/M/Y
        // This converts 11/8/2025 (Nov 8) to 08-11-2025
        return `${p2.padStart(2, "0")}-${p1.padStart(2, "0")}-${p3}`;
    }

    return str; // Return raw if unmatched, validation will catch it
}

// STRICT MUNIM MAPPINGS + CUSTOM TEMPLATE MAPPINGS
const B2B_HEADER_MAPPINGS: Record<string, string> = {
    // Identity
    "billing gstin": "gstin", "gstin": "gstin",
    "billing name": "receiverName", "receiver name": "receiverName",

    // Invoice Details
    "invoice no": "invoiceNumber",
    "invoice date": "invoiceDate",

    // Value
    "total transaction value": "invoiceValue", "total value": "invoiceValue",

    // State
    "place of supply state": "placeOfSupply",
    "place of supply": "placeOfSupply",

    // Reverse Charge
    "reverse charge": "reverseCharge",

    // Rate 
    "applicable % of tax rate": "rate",
    "rate (%)": "rate", "rate": "rate",

    // Rate Components (Multiple variations for different template formats)
    "cgst rate %": "cgstRate", "cgst %": "cgstRate", "cgst": "cgstRate",
    "sgst rate %": "sgstRate", "sgst %": "sgstRate", "sgst": "sgstRate",
    "igst rate %": "igstRate", "igst %": "igstRate", "igst": "igstRate",
    "integrated tax rate %": "igstRate",

    // Taxable
    "taxable value": "taxableValue",

    // Tax Amounts (Multiple variations)
    "igst amount": "igstAmount", "igst amt": "igstAmount", "integrated tax amount": "igstAmount",
    "cgst amount": "cgstAmount", "cgst amt": "cgstAmount",
    "sgst amount": "sgstAmount", "sgst amt": "sgstAmount",
    "cess amount": "cessAmount", "cess amt": "cessAmount",

    // Item Details
    "hsn / sac code": "hsnCode", "hsn code": "hsnCode",
    "item description": "description",
    "quantity": "quantity",
    "item unit uom": "unit", "unit": "unit"
};

export function cleanB2BRow(row: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
        if (value === undefined || value === null || value === "") continue;

        switch (key) {
            case "gstin": cleaned[key] = String(value).toUpperCase().trim(); break;
            case "invoiceNumber": cleaned[key] = String(value).trim(); break;
            case "receiverName": cleaned[key] = String(value).trim(); break;
            case "invoiceDate": cleaned[key] = excelDateToString(value as any); break;

            case "placeOfSupply":
                // Munim: "33-Tamil Nadu" -> "33"
                const posStr = String(value).trim();
                const match = posStr.match(/^(\d{2})/);
                cleaned[key] = match ? match[1] : posStr.padStart(2, "0").slice(0, 2);
                break;

            case "reverseCharge":
                const rcVal = String(value).toUpperCase().trim();
                cleaned[key] = rcVal === "Y" || rcVal === "YES" ? "Y" : "N";
                break;

            case "rate": case "cgstRate": case "sgstRate": case "igstRate":
            case "invoiceValue": case "taxableValue":
            case "igstAmount": case "cgstAmount": case "sgstAmount": case "cessAmount": case "quantity":
                const numVal = parseFloat(String(value).replace(/[₹,\s%]/g, ""));
                cleaned[key] = isNaN(numVal) ? 0 : numVal;
                break;

            default: cleaned[key] = value;
        }
    }

    // Logic: Derive Rate if missing
    if (!cleaned["rate"] || cleaned["rate"] === 0) {
        const igstRate = cleaned["igstRate"] as number;
        const cgstRate = cleaned["cgstRate"] as number;

        let derivedRate = 0;
        if (igstRate && igstRate > 0) {
            derivedRate = igstRate;
        } else if (cgstRate && cgstRate > 0) {
            derivedRate = cgstRate * 2;
        } else if (cleaned["taxableValue"] && (cleaned["igstAmount"] || cleaned["cgstAmount"])) {
            const tax = ((cleaned["igstAmount"] as number) || 0) +
                ((cleaned["cgstAmount"] as number) || 0) +
                ((cleaned["sgstAmount"] as number) || 0);
            const taxable = cleaned["taxableValue"] as number;
            if (taxable > 0) {
                derivedRate = (tax / taxable) * 100;
            }
        }

        // Round to nearest standard GST rate (including 9% for CGST/SGST)
        const standardRates = [0, 5, 9, 12, 18, 28];
        const nearestRate = standardRates.reduce((a, b) =>
            Math.abs(b - derivedRate) < Math.abs(a - derivedRate) ? b : a
        );
        cleaned["rate"] = nearestRate;
    }

    // Logic: Invoice Value Auto-fill
    if (cleaned["invoiceValue"] === undefined && typeof cleaned["taxableValue"] === "number") {
        const taxable = cleaned["taxableValue"] as number;
        const igst = (cleaned["igstAmount"] as number) || 0;
        const cgst = (cleaned["cgstAmount"] as number) || 0;
        const sgst = (cleaned["sgstAmount"] as number) || 0;
        const cess = (cleaned["cessAmount"] as number) || 0;
        cleaned["invoiceValue"] = taxable + igst + cgst + sgst + cess;
    }

    return cleaned;
}

export function validateB2BRows(rows: Record<string, unknown>[], externalSeenSet?: Set<string>): ValidationResult {
    const validRows: B2BInvoiceRow[] = [];
    const errorRows: ErrorRow[] = [];
    // Use external set if provided (for multi-file batches), otherwise local
    const seenInvoices = externalSeenSet || new Set<string>();

    rows.forEach((row, index) => {
        // Since we filtered junk rows, 'index' in this array corresponds to valid invoice seq number
        // but let's try to pass the original Excel Row number if possible? 
        // We lost the original row number reference during filter. 
        // That's fine, "Row Index + Header Offset" is a good approximation.
        // Assuming headers at 1, junk at 2,3. Data starts 4.
        // The first row here is effectively data row 1 -> original row 4?
        const rowNumber = index + 1;

        const cleanedRow = cleanB2BRow(row);
        const result = B2BInvoiceRowSchema.safeParse(cleanedRow);

        if (result.success) {
            const data = result.data;
            // Duplicate Check: Invoice Number MUST be unique for the supplier in a financial year
            // We ignore the receiver's GSTIN for uniqueness check
            const uniqueKey = data.invoiceNumber.toUpperCase();

            // Check against the set (which might effectively correspond to "seen in this batch so far")
            if (seenInvoices.has(uniqueKey)) {
                errorRows.push({
                    rowNumber,
                    data: row,
                    errors: [`Duplicate Invoice Number: ${data.invoiceNumber} already exists.`]
                });
            } else {
                seenInvoices.add(uniqueKey);
                validRows.push(data);
            }
        } else {
            const errors = result.error.errors.map((err) => {
                const field = err.path.join(".");
                return `${field} - ${err.message}`; // Simplified error message
            });
            errorRows.push({ rowNumber, data: row, errors });
        }
    });

    return { validRows, errorRows };
}

export function groupB2BInvoices(rows: B2BInvoiceRow[]): B2BInvoice[] {
    const invoiceMap = new Map<string, B2BInvoice>();

    rows.forEach((row) => {
        const key = `${row.gstin}_${row.invoiceNumber}`;
        const item: InvoiceItem = {
            hsnCode: row.hsnCode, description: row.description, quantity: row.quantity, unit: row.unit,
            rate: row.rate, taxableValue: row.taxableValue,
            igstAmount: row.igstAmount, cgstAmount: row.cgstAmount, sgstAmount: row.sgstAmount, cessAmount: row.cessAmount,
        };

        if (invoiceMap.has(key)) {
            const invoice = invoiceMap.get(key)!;
            invoice.items.push(item);
            invoice.totalTaxableValue += row.taxableValue;
            invoice.totalIgst += row.igstAmount;
            invoice.totalCgst += row.cgstAmount;
            invoice.totalSgst += row.sgstAmount;
            invoice.totalCess += row.cessAmount;
            invoice.totalTaxAmount = invoice.totalIgst + invoice.totalCgst + invoice.totalSgst + invoice.totalCess;
            invoice.invoiceValue += (row.taxableValue + row.igstAmount + row.cgstAmount + row.sgstAmount + row.cessAmount);
        } else {
            const totalTax = row.igstAmount + row.cgstAmount + row.sgstAmount + row.cessAmount;
            const lineTotal = row.taxableValue + totalTax;

            const invoice: B2BInvoice = {
                id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                gstin: row.gstin,
                receiverName: row.receiverName,
                invoiceNumber: row.invoiceNumber, invoiceDate: row.invoiceDate,
                invoiceValue: lineTotal,
                placeOfSupply: row.placeOfSupply, reverseCharge: row.reverseCharge,
                items: [item],
                totalTaxableValue: row.taxableValue, totalIgst: row.igstAmount, totalCgst: row.cgstAmount, totalSgst: row.sgstAmount, totalCess: row.cessAmount, totalTaxAmount: totalTax
            };
            invoiceMap.set(key, invoice);
        }
    });
    return Array.from(invoiceMap.values());
}

export const B2B_PROCESSOR = {
    HEADER_MAPPINGS: B2B_HEADER_MAPPINGS,
    cleanRow: cleanB2BRow,
    validate: validateB2BRows,
    group: groupB2BInvoices
};
