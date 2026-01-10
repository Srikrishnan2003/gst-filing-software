import ExcelJS from "exceljs";
import { type ErrorRow, type ValidationResult } from "@/lib/schemas/gst-schema";
import { type CDNRInvoice } from "@/lib/schemas/cdnr-schema";
import { type B2BInvoice } from "@/lib/schemas/gst-schema";
import { B2B_PROCESSOR } from "./processors/b2b-processor";
import { CDNR_PROCESSOR } from "./processors/cdnr-processor";

// Re-export types
export type { B2BInvoice, ErrorRow, ValidationResult };

export interface ProcessingResult {
    invoices: (B2BInvoice | CDNRInvoice)[];
    errors: ErrorRow[];
    summary: { total: number; valid: number; error: number };
}

/**
 * Aggressive normalization of header strings
 * Removes *, ., (), and collapses spaces
 */
function normalizeString(header: string): string {
    if (!header || typeof header !== 'string') return "";
    return header
        .toLowerCase()
        .replace(/[*.]/g, "") // Remove stars and dots
        .replace(/[()]/g, "") // Remove parentheses
        .replace(/\s+/g, " ") // Collapse spaces
        .trim();
}

/**
 * Normalizes all headers from an Excel row and returns a mapping
 */
function normalizeHeaders(headerRow: string[], mappingDict: Record<string, string>): Record<number, string> {
    const mapping: Record<number, string> = {};

    headerRow.forEach((header, index) => {
        const normalized = normalizeString(header);
        const mappedKey = mappingDict[normalized];
        if (mappedKey) {
            mapping[index] = mappedKey;
        }
    });

    return mapping;
}

/**
 * Helper to safely extract primitive value from ExcelJS cell.value
 * Handles RichText, Hyperlinks, Formulas, etc.
 */
function getCellValue(cellValue: any): string | number | Date | null | boolean {
    if (cellValue === null || cellValue === undefined) return null;

    // 1. Primitive types
    if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean' || cellValue instanceof Date) {
        return cellValue;
    }

    // 2. Formula (has .result)
    // ExcelJS formula object: { formula: "...", result: val }
    if (typeof cellValue === 'object' && 'result' in cellValue) {
        // Result could be an error object, check that?
        // Assuming result is primitive or Date
        return cellValue.result as string | number | Date;
    }

    // 3. Rich Text (value.richText = [{text: '...'}, ...])
    if (typeof cellValue === 'object' && 'richText' in cellValue && Array.isArray(cellValue.richText)) {
        return cellValue.richText.map((rt: any) => rt.text).join('');
    }

    // 4. Hyperlink (value.text, value.hyperlink)
    if (typeof cellValue === 'object' && 'text' in cellValue && 'hyperlink' in cellValue) {
        return cellValue.text;
    }

    // 5. Fallback for other objects
    // Avoid String(object) which results in "[object Object]"
    if (typeof cellValue === 'object') {
        return null;
    }

    return String(cellValue);
}

async function parseExcel(file: File, headerMappingDict: Record<string, string>, type: 'B2B' | 'CDNR' = 'B2B'): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
        // Enforce .xlsx or .csv extension
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension !== 'xlsx' && extension !== 'csv') {
            reject(new Error("Only modern Excel files (.xlsx) or CSV files are supported."));
            return;
        }

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const workbook = new ExcelJS.Workbook();

                if (extension === 'csv') {
                    const text = e.target?.result as string;
                    const worksheet = workbook.addWorksheet('Sheet1');
                    const rows = text.split(/\r?\n/);
                    rows.forEach(rowStr => {
                        if (!rowStr.trim()) return;
                        // Regex for CSV split handling quotes: /,(?=(?:(?:[^"]*"){2})*[^"]*$)/
                        const values = rowStr.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                        worksheet.addRow(values);
                    });
                } else {
                    const buffer = e.target?.result as ArrayBuffer;
                    try {
                        await workbook.xlsx.load(buffer);
                    } catch (loadError) {
                        console.error("Workbook load error:", loadError);
                        throw new Error("Invalid or corrupted .xlsx file.");
                    }
                }

                // Type-specific Sheet Detection
                // B2B looks for: b2b, gstr1, invoice, sales (but NOT cdnr/credit/debit)
                // CDNR looks for: cdnr, credit, debit, note
                const b2bPatterns = ['b2b', 'gstr1', 'invoice', 'sales'];
                const cdnrPatterns = ['cdnr', 'credit', 'debit', 'note'];
                const targetPatterns = type === 'CDNR' ? cdnrPatterns : b2bPatterns;
                const excludePatterns = type === 'CDNR' ? b2bPatterns : cdnrPatterns;

                let targetSheet: ExcelJS.Worksheet | undefined = undefined;

                // First try to find exact match for the type
                for (const sheet of workbook.worksheets) {
                    const lowerName = sheet.name.toLowerCase();
                    // Check if sheet matches target patterns
                    const matchesTarget = targetPatterns.some(pattern => lowerName.includes(pattern));
                    // Check if sheet matches patterns we should exclude
                    const matchesExclude = excludePatterns.some(pattern => lowerName.includes(pattern));

                    if (matchesTarget && !matchesExclude) {
                        targetSheet = sheet;
                        break;
                    }
                }

                // If no type-specific sheet found, return empty array (no data for this type)
                if (!targetSheet) {
                    console.log(`No ${type} sheet found in file "${file.name}"`);
                    resolve([]); // Return empty - no data for this type
                    return;
                }

                console.log(`Using sheet: "${targetSheet.name}" for ${type}`);


                // Convert worksheet to array of arrays for header detection
                // We only scan the first 20 rows to find the header
                const previewRows: string[][] = [];
                targetSheet.eachRow((row, rowNumber) => {
                    if (rowNumber <= 20) {
                        // ExcelJS values are 1-indexed, index 0 is sometimes reserved.
                        // We need to treat it as an array of strings.
                        // row.values can be [empty, val1, val2] or {1: val1, 2: val2} depending on sparse
                        // Safest is to map cells
                        const rowValues: string[] = [];
                        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                            // Map to 0-indexed array
                            const raw = getCellValue(cell.value);
                            rowValues[colNumber - 1] = raw !== null ? String(raw) : "";
                        });
                        previewRows.push(rowValues);
                    }
                });

                if (previewRows.length < 1) {
                    reject(new Error("Excel file appears to be empty"));
                    return;
                }

                // Smart Header Detection
                let headerRowIndex = -1; // 0-based index relative to previewRows (which are absolute 1..20)
                let maxMatches = 0;
                let actualHeaderRowNumber = 1; // 1-based absolute Excel row number

                for (let i = 0; i < previewRows.length; i++) {
                    const row = previewRows[i];
                    let matches = 0;
                    row.forEach(cell => {
                        const normalized = normalizeString(cell);
                        if (headerMappingDict[normalized]) {
                            matches++;
                        }
                    });

                    if (matches > maxMatches && matches >= 3) {
                        maxMatches = matches;
                        headerRowIndex = i;
                        // The previewRows[i] was the i-th row encountered.
                        // Since we iterate sequentially, we need to find the REAL row number.
                        // However, to keep it simple, we can re-iterate or assume sequential if no gaps.
                        // Let's assume sequential for the first few rows usually. 
                        // Actually, targetSheet.eachRow skips empty rows by default unless includeEmpty is not standard.
                    }
                }

                // If we found a header in our preview, we need to map it back to the Excel row number
                // Since previewRows is just a push of .eachRow, let's find the absolute row number
                if (headerRowIndex !== -1) {
                    // We need to re-find this row to get its exact number or trust our index if no empty top rows
                    // Let's do a more robust approach:
                } else {
                    console.warn("Could not auto-detect header row, defaulting to first row.");
                    headerRowIndex = 0;
                }

                // Let's get the standard header row content
                const headerRowContent = previewRows[headerRowIndex];
                console.log(`Detected header at relative preview index: ${headerRowIndex} with ${maxMatches} matches.`);

                const headerMapping = normalizeHeaders(headerRowContent, headerMappingDict);

                // Now iterate ALL rows from the detected header downwards
                const dataRows: Record<string, unknown>[] = [];

                // We need to know which logical row number the header was.
                // Since `previewRows` only contained non-empty rows (mostly), 
                // we can't trivially guess the row number if there were gaps.
                // Simpler approach: Just use the `headerRowIndex` which is 0-indexed into `previewRows`.
                // BUT we need to process the REST of the file.

                // Let's just iterate the whole sheet again and skip until we pass the header.
                // This is slightly inefficient but safe.
                // Better: Keep track of "header found" state.

                let isHeaderFound = false;
                let headerMatchesRemaining = maxMatches; // simplistic check, or just match exact content

                // Actually, we can just use the fact that `previewRows[headerRowIndex]` IS the header.
                // We need to skip `headerRowIndex + 1` rows from the start of `eachRow` iteration? No.

                // Let's restart iteration logic to be clean:
                let currentRowIndex = 0;
                targetSheet.eachRow((row, rowNumber) => {
                    // Convert row to string array for this row
                    const rowValues: string[] = [];
                    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                        const raw = getCellValue(cell.value);
                        rowValues[colNumber - 1] = raw !== null ? String(raw) : "";
                    });

                    // If we haven't confirmed passing the header yet
                    if (currentRowIndex < headerRowIndex) {
                        currentRowIndex++;
                        return; // Skip pre-header rows
                    }

                    if (currentRowIndex === headerRowIndex) {
                        // This is the header row, skip it
                        currentRowIndex++;
                        return;
                    }

                    // This is a data row
                    const obj: Record<string, unknown> = {};
                    let hasData = false;

                    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                        const key = headerMapping[colNumber - 1]; // colNumber is 1-based
                        if (key) {
                            let val = getCellValue(cell.value);

                            // Handle formula result if getCellValue returned an object (?) - No, getCellValue handles it.
                            // But wait, if getCellValue returns date, cleanB2BRow handles it.

                            obj[key] = val;
                            if (val !== undefined && val !== null && String(val).trim() !== "") {
                                hasData = true;
                            }
                        }
                    });

                    if (hasData) {
                        dataRows.push(obj);
                    }
                    currentRowIndex++;
                });

                resolve(dataRows);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error("Failed to read file"));
        };

        if (extension === 'csv') {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

export async function processExcelFile(file: File, type: 'B2B' | 'CDNR' = 'B2B', externalSeenSet?: Set<string>): Promise<ProcessingResult> {
    const processor = type === 'CDNR' ? CDNR_PROCESSOR : B2B_PROCESSOR;
    const rawRows = await parseExcel(file, processor.HEADER_MAPPINGS, type);

    // If no rows found (sheet doesn't exist for this type), return empty result
    if (rawRows.length === 0) {
        return {
            invoices: [],
            errors: [],
            summary: { total: 0, valid: 0, error: 0 },
        };
    }

    // @ts-ignore
    const { validRows, errorRows } = processor.validate(rawRows, externalSeenSet);
    // @ts-ignore 
    const invoices = processor.group(validRows);

    return {
        invoices,
        errors: errorRows,
        summary: {
            total: rawRows.length,
            valid: validRows.length,
            error: errorRows.length,
        },
    };
}
