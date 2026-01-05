import { z } from "zod";

// Reusing valid GSTIN regex and types from B2B schema would be ideal, 
// but for strict modularity per user request, we redefine or import common utils.
// Here we duplicate critical constants to ensure this file is standalone if needed,
// but ideally we should have a 'common.ts' for shared regexes.
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const GST_RATES = [0, 5, 12, 18, 28] as const;
const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;

/**
 * Schema for a single row from Excel representing a Credit/Debit Note
 */
export const CDNRRowSchema = z.object({
    // GSTIN of the Receiver (Customer)
    gstin: z.string().regex(GSTIN_REGEX, "Invalid GSTIN format"),

    // Note Type: C = Credit, D = Debit
    noteType: z.enum(["C", "D"], {
        errorMap: () => ({ message: "Note Type must be 'C' (Credit) or 'D' (Debit)" })
    }),

    // Note Number (The ID of the return document)
    noteNumber: z.string().min(1, "Note Number is required").max(16),

    // Note Date
    noteDate: z.string().regex(dateRegex, "Note Date must be DD-MM-YYYY"),

    // Original Invoice Number (Mandatory for GST returns)
    originalInvoiceNumber: z.string().min(1, "Original Invoice Number is required"),

    // Original Invoice Date
    originalInvoiceDate: z.string().regex(dateRegex, "Original Invoice Date must be DD-MM-YYYY"),

    // Place of Supply
    placeOfSupply: z.string().regex(/^\d{2}$/, "Place of supply must be a 2-digit state code"),

    // Note Value (Total Value of the Note)
    noteValue: z.number().positive("Note Value must be positive"),

    // Rate
    rate: z.number().refine((val) => GST_RATES.includes(val as typeof GST_RATES[number]), {
        message: `Rate must be one of: ${GST_RATES.join(", ")}`,
    }),

    // Taxable Value
    taxableValue: z.number().nonnegative("Taxable Value cannot be negative"),

    // Tax Amounts
    igstAmount: z.number().nonnegative().optional().default(0),
    cgstAmount: z.number().nonnegative().optional().default(0),
    sgstAmount: z.number().nonnegative().optional().default(0),
    cessAmount: z.number().nonnegative().optional().default(0),

    // Pre-GST Regime (Optional, default N)
    preGst: z.enum(["Y", "N"]).optional().default("N"),
});

export type CDNRRow = z.infer<typeof CDNRRowSchema>;

/**
 * Grouped Credit/Debit Note
 */
export interface CDNRInvoice {
    id: string;
    gstin: string; // Receiver GSTIN
    noteType: "C" | "D";
    noteNumber: string;
    noteDate: string;
    originalInvoiceNumber: string;
    originalInvoiceDate: string;
    noteValue: number;
    placeOfSupply: string;
    preGst: "Y" | "N";

    // Items array (similar to B2B, but simpler usually)
    items: Array<{
        rate: number;
        taxableValue: number;
        igstAmount: number;
        cgstAmount: number;
        sgstAmount: number;
        cessAmount: number;
    }>;

    // Totals
    totalTaxableValue: number;
    totalIgst: number;
    totalCgst: number;
    totalSgst: number;
    totalCess: number;
    totalTaxAmount: number;
}
