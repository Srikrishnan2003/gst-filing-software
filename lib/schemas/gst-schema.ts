import { z } from "zod";

// GSTIN regex pattern for Indian GST Identification Number
// Format: 2 digits (state code) + 5 letters (PAN first 5) + 4 digits (PAN next 4) + 1 letter + 1 alphanumeric + Z + 1 alphanumeric
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Valid GST tax rates (including 9% for CGST/SGST split of 18%)
const GST_RATES = [0, 5, 9, 12, 18, 28] as const;

// Date format helper - validates DD-MM-YYYY format
const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;

/**
 * Schema for a single row from Excel representing a line item in an invoice
 */
export const B2BInvoiceRowSchema = z.object({
  // Buyer GSTIN - mandatory for B2B invoices
  gstin: z
    .string()
    .regex(GSTIN_REGEX, "Invalid GSTIN format"),

  // Receiver/Party Name (Optional but good for UI)
  receiverName: z.string().optional(),

  // Invoice number - unique identifier
  invoiceNumber: z
    .string()
    .min(1, "Invoice number is required")
    .max(16, "Invoice number cannot exceed 16 characters"),

  // Invoice date in DD-MM-YYYY format
  invoiceDate: z
    .string()
    .regex(dateRegex, "Date must be in DD-MM-YYYY format"),

  // Invoice value (total including tax)
  invoiceValue: z
    .number()
    .positive("Invoice value must be positive"),

  // Place of supply - 2 digit state code
  placeOfSupply: z
    .string()
    .regex(/^\d{2}$/, "Place of supply must be a 2-digit state code"),

  // Reverse charge applicable
  reverseCharge: z
    .enum(["Y", "N"])
    .default("N"),

  // Applicable tax rate
  rate: z
    .number()
    .refine((val) => GST_RATES.includes(val as typeof GST_RATES[number]), {
      message: `Rate must be one of: ${GST_RATES.join(", ")}`,
    }),

  // Taxable value (value before tax)
  taxableValue: z
    .number()
    .positive("Taxable value must be positive"),

  // Integrated GST amount (for inter-state)
  igstAmount: z
    .number()
    .nonnegative("IGST amount cannot be negative")
    .optional()
    .default(0),

  // Central GST amount (for intra-state)
  cgstAmount: z
    .number()
    .nonnegative("CGST amount cannot be negative")
    .optional()
    .default(0),

  // State GST amount (for intra-state)
  sgstAmount: z
    .number()
    .nonnegative("SGST amount cannot be negative")
    .optional()
    .default(0),

  // Cess amount (if applicable)
  cessAmount: z
    .number()
    .nonnegative("Cess amount cannot be negative")
    .optional()
    .default(0),

  // HSN/SAC code
  hsnCode: z
    .string()
    .min(2, "HSN code must be at least 2 digits")
    .optional(),

  // Description of goods/services
  description: z
    .string()
    .optional(),

  // Quantity
  quantity: z
    .number()
    .positive("Quantity must be positive")
    .optional(),

  // Unit of measurement
  unit: z
    .string()
    .optional(),
});

/**
 * Type for a validated row from Excel
 */
export type B2BInvoiceRow = z.infer<typeof B2BInvoiceRowSchema>;

/**
 * Type for a row that failed validation
 */
export interface ErrorRow {
  rowNumber: number;
  data: Record<string, unknown>;
  errors: string[];
}

/**
 * Item within a grouped invoice
 */
export interface InvoiceItem {
  hsnCode?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  rate: number;
  taxableValue: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  cessAmount: number;
}

/**
 * Grouped invoice with multiple items
 */
export interface B2BInvoice {
  id: string;
  gstin: string;
  receiverName?: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  placeOfSupply: string;
  reverseCharge: "Y" | "N";
  items: InvoiceItem[];
  totalTaxableValue: number;
  totalIgst: number;
  totalCgst: number;
  totalSgst: number;
  totalCess: number;
  totalTaxAmount: number;
}

/**
 * Validation result structure
 */
export interface ValidationResult {
  validRows: B2BInvoiceRow[];
  errorRows: ErrorRow[];
}

/**
 * Store validation summary
 */
export interface ValidationSummary {
  total: number;
  valid: number;
  error: number;
}

/**
 * GSTR-1 JSON format for B2B invoices
 */
// HSN Summary Type
export interface HSNSection {
  flag: "N" | "Y";
  hsn_b2b: Array<{
    num: number;
    hsn_sc: string; // HSN Code
    desc: string; // Description
    uqc: string; // Unit
    qty: number;
    val?: number; // Total Value (Optional?)
    txval: number; // Taxable Value
    iamt: number;
    camt: number;
    samt: number;
    csamt: number;
    rt: number; // Rate
  }>;
  hsn_b2c?: any[]; // For future
}

// Document Issue Summary Type
export interface DocIssueSection {
  flag: "N" | "Y";
  doc_det: Array<{
    doc_num: number;
    docs: Array<{
      num: number;
      from: string; // From Invoice
      to: string; // To Invoice
      totnum: number; // Total Count
      cancel: number; // Cancelled Count
      net_issue: number; // Net Issued
    }>
  }>;
}

export interface GSTR1B2BFormat {
  gstin: string;
  fp: string;
  gt: number; // Gross Turnover (0)
  cur_gt: number; // Current Gross Turnover (0)
  b2b: Array<{
    ctin: string;
    inv: Array<{
      inum: string;
      idt: string;
      val: number;
      pos: string;
      rchrg: "Y" | "N";
      inv_typ: "R"; // Regular
      itms: Array<{
        num: number;
        itm_det: {
          rt: number;
          txval: number;
          iamt: number;
          camt: number;
          samt: number;
          csamt: number;
        };
      }>;
    }>;
  }>;
  hsn?: HSNSection;
  doc_issue?: DocIssueSection;
}
