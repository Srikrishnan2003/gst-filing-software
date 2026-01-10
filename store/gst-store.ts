import { create } from "zustand";
import { type B2BInvoice, type B2BInvoiceRow, B2BInvoiceRowSchema, type ErrorRow, type ValidationSummary, type GSTR1B2BFormat } from "@/lib/schemas/gst-schema";
import { type CDNRInvoice } from "@/lib/schemas/cdnr-schema";
import { type ProcessingResult } from "@/lib/services/excel-processor";
import { readJSONFile } from "@/lib/services/json-parser";
import { getHSNDescription } from "@/lib/data/hsn-master";

interface GSTStore {
    // Step management
    currentStep: number;
    setStep: (step: number) => void;

    // File processing state
    rawFiles: File[];
    sourceType: 'excel' | 'json';
    isProcessing: boolean;
    processingError: string | null;

    // Data State
    returnType: 'B2B' | 'CDNR'; // To toggle between modes
    setReturnType: (type: 'B2B' | 'CDNR') => void;

    // Invoice data (separate for each type)
    b2bInvoices: B2BInvoice[];
    cdnrInvoices: CDNRInvoice[];

    // Errors and summaries (separate for each type)
    b2bErrors: ErrorRow[];
    cdnrErrors: ErrorRow[];
    b2bSummary: ValidationSummary;
    cdnrSummary: ValidationSummary;

    // Actions
    addFiles: (files: File[]) => void;
    removeFile: (index: number) => void;
    processFiles: () => Promise<void>;
    reset: () => void;
    downloadJSON: (gstin: string, filingPeriod: string) => void;

    // Error editing actions
    updateErrorRow: (index: number, data: Record<string, unknown>) => boolean;
    removeError: (index: number) => void;
}

export const useGSTStore = create<GSTStore>((set, get) => ({
    currentStep: 1,
    rawFiles: [],
    sourceType: 'excel',
    isProcessing: false,
    processingError: null,
    returnType: 'B2B', // Default to B2B

    // Separate state for each type
    b2bInvoices: [],
    cdnrInvoices: [],
    b2bErrors: [],
    cdnrErrors: [],
    b2bSummary: { total: 0, valid: 0, error: 0 },
    cdnrSummary: { total: 0, valid: 0, error: 0 },

    setStep: (step) => set({ currentStep: step }),

    setReturnType: (type) => set({ returnType: type }), // Toggle logic

    addFiles: (files) => {
        set((state) => ({
            rawFiles: [...state.rawFiles, ...files],
            currentStep: 1 // Stay on step 1 (preview state)
        }));
    },

    removeFile: (index) => {
        set((state) => {
            const newFiles = [...state.rawFiles];
            newFiles.splice(index, 1);
            return { rawFiles: newFiles };
        });
    },

    processFiles: async () => {
        const { rawFiles } = get();
        if (rawFiles.length === 0) return;

        set({ isProcessing: true, processingError: null });

        try {
            const { processExcelFile } = await import("@/lib/services/excel-processor");

            // Separate accumulators for B2B and CDNR
            let allB2B: B2BInvoice[] = [];
            let allCDNR: CDNRInvoice[] = [];
            let b2bErrors: ErrorRow[] = [];
            let cdnrErrors: ErrorRow[] = [];
            let b2bSummary = { total: 0, valid: 0, error: 0 };
            let cdnrSummary = { total: 0, valid: 0, error: 0 };
            const globalB2BSeenSet = new Set<string>();
            const globalCDNRSeenSet = new Set<string>();

            // Process all files for BOTH B2B and CDNR
            for (const file of rawFiles) {
                const fileExtension = file.name.split('.').pop()?.toLowerCase();

                if (fileExtension === 'json') {
                    // Handle JSON files - only B2B supported in JSON
                    try {
                        const jsonResult = await readJSONFile(file);
                        allB2B = [...allB2B, ...jsonResult.b2bInvoices];
                        b2bSummary.total += jsonResult.b2bInvoices.length;
                        b2bSummary.valid += jsonResult.b2bInvoices.length;
                    } catch (jsonError) {
                        console.error("JSON parsing error:", jsonError);
                        b2bErrors.push({
                            rowNumber: 0,
                            data: { fileName: file.name },
                            errors: [`Failed to parse JSON file: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`]
                        });
                        b2bSummary.total += 1;
                        b2bSummary.error += 1;
                    }
                } else {
                    // Handle Excel/CSV files - process BOTH B2B and CDNR

                    // Process B2B sheet
                    try {
                        const b2bResult = await processExcelFile(file, 'B2B', globalB2BSeenSet);
                        allB2B = [...allB2B, ...(b2bResult.invoices as B2BInvoice[])];
                        b2bErrors = [...b2bErrors, ...b2bResult.errors];
                        b2bSummary.total += b2bResult.summary.total;
                        b2bSummary.valid += b2bResult.summary.valid;
                        b2bSummary.error += b2bResult.summary.error;
                    } catch (b2bError) {
                        console.error("B2B processing error:", b2bError);
                        // Don't add error for missing B2B sheet - it's optional
                    }

                    // Process CDNR sheet
                    try {
                        const cdnrResult = await processExcelFile(file, 'CDNR', globalCDNRSeenSet);
                        allCDNR = [...allCDNR, ...(cdnrResult.invoices as CDNRInvoice[])];
                        cdnrErrors = [...cdnrErrors, ...cdnrResult.errors];
                        cdnrSummary.total += cdnrResult.summary.total;
                        cdnrSummary.valid += cdnrResult.summary.valid;
                        cdnrSummary.error += cdnrResult.summary.error;
                    } catch (cdnrError) {
                        console.error("CDNR processing error:", cdnrError);
                        // Don't add error for missing CDNR sheet - it's optional
                    }
                }
            }

            set({
                b2bInvoices: allB2B,
                cdnrInvoices: allCDNR,
                b2bErrors,
                cdnrErrors,
                b2bSummary,
                cdnrSummary,
                isProcessing: false,
                currentStep: 2 // Move to dashboard
            });

        } catch (error) {
            console.error("Processing failed:", error);
            set({
                isProcessing: false,
                processingError: error instanceof Error ? error.message : "Failed to process files",
            });
        }
    },

    reset: () => {
        set({
            currentStep: 1,
            rawFiles: [],
            isProcessing: false,
            processingError: null,
            b2bInvoices: [],
            cdnrInvoices: [],
            b2bErrors: [],
            cdnrErrors: [],
            b2bSummary: { total: 0, valid: 0, error: 0 },
            cdnrSummary: { total: 0, valid: 0, error: 0 },
        });
    },

    generateGSTR1JSON: (gstin: string, filingPeriod: string) => {
        return {
            gstin,
            fp: filingPeriod
            // Dynamic construction below
        };
    },

    downloadJSON: (gstin: string, filingPeriod: string) => {
        const { b2bInvoices, cdnrInvoices, returnType } = get();

        // Helper function to build tax detail object, omitting zero-value fields
        const buildTaxDetails = (item: { rate: number; taxableValue: number; igstAmount: number; cgstAmount: number; sgstAmount: number; cessAmount: number }) => {
            const itm_det: any = {
                csamt: item.cessAmount, // Always include cess (usually 0)
                rt: item.rate,
                txval: item.taxableValue,
            };

            // Only include non-zero tax amounts (GST portal convention)
            if (item.igstAmount > 0) {
                itm_det.iamt = item.igstAmount;
            }
            if (item.cgstAmount > 0) {
                itm_det.camt = item.cgstAmount;
            }
            if (item.sgstAmount > 0) {
                itm_det.samt = item.sgstAmount;
            }

            return itm_det;
        };

        // Helper function to get rate-based item number (GST portal convention)
        // Format: {rate * 100} + 1, e.g., 18% = 1801, 5% = 501
        const getRateBasedItemNum = (rate: number): number => {
            return Math.round(rate * 100) + 1;
        };

        // Base structure with required root fields
        const gstr1: any = {
            gstin: gstin.toUpperCase(),
            fp: filingPeriod,
            filing_typ: "M",  // Monthly filing
            gt: 0.0,          // Gross turnover (float)
            cur_gt: 0.0,      // Current gross turnover (float)
        };

        if (returnType === 'B2B' && b2bInvoices.length > 0) {
            // Sort invoices by invoice number first
            const sortedInvoices = [...b2bInvoices].sort((a, b) =>
                a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, { numeric: true })
            );

            // 1. Group by CTIN (Customer GSTIN)
            const b2bMap = new Map<string, any>();
            sortedInvoices.forEach(inv => {
                const ctin = inv.gstin;
                if (!b2bMap.has(ctin)) {
                    b2bMap.set(ctin, { ctin, cfs: "N", inv: [] });
                }
                const party = b2bMap.get(ctin);

                // Build item details with rate-based num and omit zero-value tax fields
                const itms = inv.items.map((item) => {
                    return {
                        num: getRateBasedItemNum(item.rate), // Use rate-based number (e.g., 1801 for 18%)
                        itm_det: buildTaxDetails(item)
                    };
                });

                // Build invoice object with GST portal metadata fields
                const invoiceObj: any = {
                    itms,
                    val: inv.invoiceValue,
                    inv_typ: "R",
                    flag: "U",           // Upload flag - required by portal
                    pos: inv.placeOfSupply,
                    updby: "S",          // Updated by System
                    idt: inv.invoiceDate,
                    rchrg: inv.reverseCharge,
                    inum: inv.invoiceNumber,
                    cflag: "N",          // Correction flag
                };

                party.inv.push(invoiceObj);
            });

            // Sort CTIN groups by CTIN
            const b2bArray = Array.from(b2bMap.values())
                .sort((a, b) => a.ctin.localeCompare(b.ctin));

            gstr1.b2b = b2bArray;

            // 2. HSN Summary Generation
            const hsnMap = new Map<string, any>();
            b2bInvoices.forEach(inv => {
                inv.items.forEach(item => {
                    // Key: HSN + Rate (to ensure unique groups)
                    const key = `${item.hsnCode || 'NA'}_${item.rate}`;

                    if (!hsnMap.has(key)) {
                        hsnMap.set(key, {
                            num: 0, // Assigned later
                            hsn_sc: item.hsnCode || "NA",
                            desc: getHSNDescription(item.hsnCode),
                            uqc: "NA",
                            qty: 0,
                            txval: 0,
                            iamt: 0, camt: 0, samt: 0, csamt: 0,
                            rt: item.rate
                        });
                    }
                    const hsnEntry = hsnMap.get(key);
                    // Only add quantity for Products (HSN not starting with 99)
                    // Services (HSN starting with 99) should have qty = 0
                    const isService = (item.hsnCode || "").startsWith("99");
                    if (!isService) {
                        hsnEntry.qty += (item.quantity || 0);
                    }
                    hsnEntry.txval += item.taxableValue;
                    hsnEntry.iamt += item.igstAmount;
                    hsnEntry.camt += item.cgstAmount;
                    hsnEntry.samt += item.sgstAmount;
                    hsnEntry.csamt += item.cessAmount;
                });
            });

            // Build HSN entries, omitting zero-value tax fields
            const hsnEntries = Array.from(hsnMap.values()).map((h, i) => {
                const entry: any = {
                    csamt: h.csamt,
                    rt: h.rt,
                    uqc: h.uqc,
                    num: i + 1,
                    txval: h.txval,
                    qty: 0, // GST portal uses 0 for qty
                    hsn_sc: h.hsn_sc,
                    desc: h.desc,
                };

                // Only include non-zero tax amounts
                if (h.iamt > 0) entry.iamt = h.iamt;
                if (h.camt > 0) entry.camt = h.camt;
                if (h.samt > 0) entry.samt = h.samt;

                return entry;
            });

            gstr1.hsn = {
                flag: "N",
                hsn_b2b: hsnEntries,
                hsn_b2c: [], // Empty array required by GST portal
            };

            // 3. Doc Issue Summary
            if (b2bInvoices.length > 0) {
                const sortedForDoc = [...b2bInvoices].sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));
                const fromInv = sortedForDoc[0].invoiceNumber;
                const toInv = sortedForDoc[sortedForDoc.length - 1].invoiceNumber;
                const count = b2bInvoices.length;

                gstr1.doc_issue = {
                    flag: "N",
                    doc_det: [{
                        docs: [{
                            cancel: 0,
                            num: 1,
                            totnum: count,
                            from: fromInv,
                            to: toInv,
                            net_issue: count
                        }],
                        doc_num: 1
                    }]
                };
            }

            // Add filing date (required by portal)
            const today = new Date();
            gstr1.fil_dt = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
        }

        if (returnType === 'CDNR' && cdnrInvoices.length > 0) {
            const cdnrMap = new Map<string, any>();
            cdnrInvoices.forEach(note => {
                const ctin = note.gstin;
                if (!cdnrMap.has(ctin)) {
                    cdnrMap.set(ctin, { ctin, nt: [] });
                }
                const party = cdnrMap.get(ctin);

                // Build item details with rate-based num and omit zero-value tax fields
                const itms = note.items.map((item) => ({
                    num: getRateBasedItemNum(item.rate),
                    itm_det: buildTaxDetails(item)
                }));

                party.nt.push({
                    nty: note.noteType,
                    nt_num: note.noteNumber,
                    nt_dt: note.noteDate,
                    inum: note.originalInvoiceNumber,
                    idt: note.originalInvoiceDate,
                    val: note.noteValue,
                    p_gst: note.preGst,
                    itms
                });
            });
            gstr1.cdnr = Array.from(cdnrMap.values());
        }

        const dataStr = JSON.stringify(gstr1, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `GSTR1_${gstin}_${filingPeriod}_${returnType}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // Update an error row with new data and attempt to validate
    updateErrorRow: (index: number, data: Record<string, unknown>) => {
        const { b2bErrors, b2bInvoices, b2bSummary, returnType } = get();
        // Currently only supports B2B error editing
        if (returnType !== 'B2B') return false;
        if (index < 0 || index >= b2bErrors.length) return false;

        // Validate with Zod
        const result = B2BInvoiceRowSchema.safeParse(data);

        if (result.success) {
            // Create a new invoice from the valid data
            const validData = result.data;
            const newInvoice: B2BInvoice = {
                id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                gstin: validData.gstin,
                receiverName: validData.receiverName,
                invoiceNumber: validData.invoiceNumber,
                invoiceDate: validData.invoiceDate,
                invoiceValue: validData.invoiceValue,
                placeOfSupply: validData.placeOfSupply,
                reverseCharge: validData.reverseCharge,
                items: [{
                    hsnCode: validData.hsnCode,
                    description: validData.description,
                    quantity: validData.quantity,
                    unit: validData.unit,
                    rate: validData.rate,
                    taxableValue: validData.taxableValue,
                    igstAmount: validData.igstAmount,
                    cgstAmount: validData.cgstAmount,
                    sgstAmount: validData.sgstAmount,
                    cessAmount: validData.cessAmount,
                }],
                totalTaxableValue: validData.taxableValue,
                totalIgst: validData.igstAmount,
                totalCgst: validData.cgstAmount,
                totalSgst: validData.sgstAmount,
                totalCess: validData.cessAmount,
                totalTaxAmount: validData.igstAmount + validData.cgstAmount + validData.sgstAmount + validData.cessAmount,
            };

            // Remove from errors and add to invoices
            const newErrors = [...b2bErrors];
            newErrors.splice(index, 1);

            set({
                b2bErrors: newErrors,
                b2bInvoices: [...b2bInvoices, newInvoice],
                b2bSummary: {
                    ...b2bSummary,
                    valid: b2bSummary.valid + 1,
                    error: b2bSummary.error - 1,
                },
            });
            return true;
        }
        return false;
    },

    // Remove an error row without validating (discard)
    removeError: (index: number) => {
        const { b2bErrors, cdnrErrors, b2bSummary, cdnrSummary, returnType } = get();

        if (returnType === 'B2B') {
            if (index < 0 || index >= b2bErrors.length) return;
            const newErrors = [...b2bErrors];
            newErrors.splice(index, 1);
            set({
                b2bErrors: newErrors,
                b2bSummary: {
                    ...b2bSummary,
                    total: b2bSummary.total - 1,
                    error: b2bSummary.error - 1,
                },
            });
        } else {
            if (index < 0 || index >= cdnrErrors.length) return;
            const newErrors = [...cdnrErrors];
            newErrors.splice(index, 1);
            set({
                cdnrErrors: newErrors,
                cdnrSummary: {
                    ...cdnrSummary,
                    total: cdnrSummary.total - 1,
                    error: cdnrSummary.error - 1,
                },
            });
        }
    },
}));

// Selector hooks
export const useCurrentStep = () => useGSTStore((state) => state.currentStep);
export const useRawFiles = () => useGSTStore((state) => state.rawFiles);
export const useIsProcessing = () => useGSTStore((state) => state.isProcessing);
export const useProcessingError = () => useGSTStore((state) => state.processingError);
export const useReturnType = () => useGSTStore((state) => state.returnType);

// Mode-aware selectors - return data based on current returnType
export const useValidationSummary = () => useGSTStore((state) =>
    state.returnType === 'B2B' ? state.b2bSummary : state.cdnrSummary
);
export const useB2BInvoices = () => useGSTStore((state) => state.b2bInvoices);
export const useCDNRInvoices = () => useGSTStore((state) => state.cdnrInvoices);
export const useErrors = () => useGSTStore((state) =>
    state.returnType === 'B2B' ? state.b2bErrors : state.cdnrErrors
);

// Get invoices based on current mode
export const useCurrentInvoices = () => useGSTStore((state) =>
    state.returnType === 'B2B' ? state.b2bInvoices : state.cdnrInvoices
);

