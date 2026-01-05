import * as XLSX from "xlsx";
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
        // We match against the mapping dict which should ALSO use keys cleaned in the same way 
        // OR we can rely on the processor exporting keys that match this output.
        // In b2b-processor.ts I updated keys to be "invoice no" etc.
        const mappedKey = mappingDict[normalized];
        if (mappedKey) {
            mapping[index] = mappedKey;
        }
    });

    return mapping;
}

async function parseExcel(file: File, headerMappingDict: Record<string, string>): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "binary", cellDates: true });

                // Smart Sheet Detection: Find sheet by name pattern
                const sheetPatterns = ['invoice', 'gstr1', 'b2b', 'sales', 'cdnr', 'credit', 'debit'];
                let targetSheet = workbook.SheetNames[0]; // Default fallback

                for (const name of workbook.SheetNames) {
                    const lowerName = name.toLowerCase();
                    if (sheetPatterns.some(pattern => lowerName.includes(pattern))) {
                        targetSheet = name;
                        break;
                    }
                }

                console.log(`Using sheet: "${targetSheet}" from available: ${workbook.SheetNames.join(', ')}`);
                const worksheet = workbook.Sheets[targetSheet];

                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    raw: false,
                    dateNF: "dd-mm-yyyy",
                }) as unknown[][];

                if (jsonData.length < 2) {
                    reject(new Error("Excel file must have at least a header row and one data row"));
                    return;
                }

                // Smart Header Detection with Aggressive Matching
                let headerRowIndex = -1;
                let maxMatches = 0;

                for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
                    const row = jsonData[i] as string[];
                    if (!Array.isArray(row)) continue;

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
                    }
                }

                if (headerRowIndex === -1) {
                    console.warn("Could not auto-detect header row, defaulting to first row.");
                    headerRowIndex = 0;
                }

                console.log(`Detected header at row index: ${headerRowIndex} with ${maxMatches} matches.`);

                const headerRow = jsonData[headerRowIndex] as string[];
                const headerMapping = normalizeHeaders(headerRow, headerMappingDict);

                // Check mapping coverage
                if (Object.keys(headerMapping).length === 0) {
                    console.warn("No headers mapped! Check your dictionary keys vs normalized file headers.");
                }

                const dataRows = jsonData.slice(headerRowIndex + 1).map((row) => {
                    const obj: Record<string, unknown> = {};
                    (row as unknown[]).forEach((cell, index) => {
                        const key = headerMapping[index];
                        if (key) {
                            obj[key] = cell;
                        }
                    });
                    return obj;
                });

                // Filter out empty rows or junk rows (must have at least 2 value columns)
                const nonEmptyRows = dataRows.filter((row) => {
                    let validCount = 0;
                    for (const val of Object.values(row)) {
                        if (val !== undefined && val !== null && String(val).trim() !== "") {
                            validCount++;
                        }
                    }
                    // Threshold: Needs at least 2 columns of data to be a valid invoice row
                    // This skips metadata rows like " Invoice regarding details..."
                    return validCount >= 2;
                });

                resolve(nonEmptyRows);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error("Failed to read file"));
        };

        reader.readAsBinaryString(file);
    });
}

export async function processExcelFile(file: File, type: 'B2B' | 'CDNR' = 'B2B'): Promise<ProcessingResult> {
    const processor = type === 'CDNR' ? CDNR_PROCESSOR : B2B_PROCESSOR;
    const rawRows = await parseExcel(file, processor.HEADER_MAPPINGS);
    const { validRows, errorRows } = processor.validate(rawRows);
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
