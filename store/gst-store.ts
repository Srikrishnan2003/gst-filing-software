import { create } from "zustand";
import { type B2BInvoice, type B2BInvoiceRow, B2BInvoiceRowSchema, type ErrorRow, type ValidationSummary, type GSTR1B2BFormat } from "@/lib/schemas/gst-schema";
import { type CDNRInvoice } from "@/lib/schemas/cdnr-schema";
import { type ProcessingResult } from "@/lib/services/excel-processor";
import { readJSONFile } from "@/lib/services/json-parser";

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

    b2bInvoices: B2BInvoice[];
    cdnrInvoices: CDNRInvoice[];
    errors: ErrorRow[];
    validationSummary: ValidationSummary;

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
    validationSummary: { total: 0, valid: 0, error: 0 },
    b2bInvoices: [],
    cdnrInvoices: [],
    errors: [],

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
        const { rawFiles, returnType } = get();
        if (rawFiles.length === 0) return;

        set({ isProcessing: true, processingError: null });

        try {
            const { processExcelFile } = await import("@/lib/services/excel-processor");

            // Accumulators
            let allB2B: B2BInvoice[] = [];
            let allCDNR: CDNRInvoice[] = [];
            let allErrors: ErrorRow[] = [];
            let totalSummary = { total: 0, valid: 0, error: 0 };
            const globalSeenSet = new Set<string>();

            // Process all files
            for (const file of rawFiles) {
                const result = await processExcelFile(file, returnType, globalSeenSet);
                if (returnType === 'B2B') {
                    // We need to merge invoices carefully. 
                    // ideally we should flatten them all then run 'group' again, but processExcelFile returns grouped invoices.
                    // Simple Concat for now. Collisions within files handled by processor. Collisions across files not handled yet (acceptable MVP).
                    allB2B = [...allB2B, ...(result.invoices as B2BInvoice[])];
                } else {
                    allCDNR = [...allCDNR, ...(result.invoices as CDNRInvoice[])];
                }

                // Merge Errors & Summary
                allErrors = [...allErrors, ...result.errors];
                totalSummary.total += result.summary.total;
                totalSummary.valid += result.summary.valid;
                totalSummary.error += result.summary.error;
            }

            set({
                b2bInvoices: allB2B,
                cdnrInvoices: allCDNR,
                errors: allErrors,
                validationSummary: totalSummary,
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
            validationSummary: { total: 0, valid: 0, error: 0 },
            b2bInvoices: [],
            cdnrInvoices: [],
            errors: [],
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

        // Base structure
        const gstr1: any = {
            gstin: gstin.toUpperCase(),
            fp: filingPeriod,
        };

        if (returnType === 'B2B' && b2bInvoices.length > 0) {
            // 1. Group by CTIN (Customer GSTIN)
            const b2bMap = new Map<string, any>();
            b2bInvoices.forEach(inv => {
                const ctin = inv.gstin;
                if (!b2bMap.has(ctin)) {
                    b2bMap.set(ctin, { ctin, cfs: "N", inv: [] }); // Added cfs field
                }
                const party = b2bMap.get(ctin);

                party.inv.push({
                    inum: inv.invoiceNumber,
                    idt: inv.invoiceDate,
                    val: inv.invoiceValue,
                    pos: inv.placeOfSupply,
                    rchrg: inv.reverseCharge,
                    inv_typ: "R", // Hardcoded Regular
                    itms: inv.items.map((item, idx) => ({
                        num: idx + 1,
                        itm_det: {
                            rt: item.rate,
                            txval: item.taxableValue,
                            iamt: item.igstAmount,
                            camt: item.cgstAmount,
                            samt: item.sgstAmount,
                            csamt: item.cessAmount
                        }
                    }))
                });
            });
            gstr1.b2b = Array.from(b2bMap.values());

            // 2. HSN Summary Generation
            const hsnMap = new Map<string, any>();
            b2bInvoices.forEach(inv => {
                inv.items.forEach(item => {
                    // Key: HSN + Rate + Unit (to ensure unique groups)
                    const key = `${item.hsnCode || 'NA'}_${item.rate}_${item.unit || 'OTH'}`;

                    if (!hsnMap.has(key)) {
                        hsnMap.set(key, {
                            num: 0, // Assigned later
                            hsn_sc: item.hsnCode || "NA",
                            desc: item.description || "Goods",
                            uqc: (item.unit || "OTH").substring(0, 3).toUpperCase(), // Limit to 3 chars roughly
                            qty: 0,
                            val: 0, // Optional
                            txval: 0,
                            iamt: 0, camt: 0, samt: 0, csamt: 0,
                            rt: item.rate
                        });
                    }
                    const hsnEntry = hsnMap.get(key);
                    hsnEntry.qty += (item.quantity || 0);
                    hsnEntry.txval += item.taxableValue;
                    hsnEntry.iamt += item.igstAmount;
                    hsnEntry.camt += item.cgstAmount;
                    hsnEntry.samt += item.sgstAmount;
                    hsnEntry.csamt += item.cessAmount;
                });
            });

            gstr1.hsn = {
                flag: "N",
                hsn_b2b: Array.from(hsnMap.values()).map((h, i) => ({ ...h, num: i + 1 }))
            };

            // 3. Doc Issue Summary (Simplified: Assumes one contiguous series)
            if (b2bInvoices.length > 0) {
                // Sort invoices by ID or Number string comparison is tricky, but we try
                // Assuming alphanumeric like "INV-001"
                const sortedInvoices = [...b2bInvoices].sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));
                const fromInv = sortedInvoices[0].invoiceNumber;
                const toInv = sortedInvoices[sortedInvoices.length - 1].invoiceNumber;
                const count = b2bInvoices.length;

                gstr1.doc_issue = {
                    flag: "N",
                    doc_det: [{
                        doc_num: 1, // Series 1
                        docs: [{
                            num: 1,
                            from: fromInv,
                            to: toInv,
                            totnum: count,
                            cancel: 0, // No cancellation logic yet
                            net_issue: count
                        }]
                    }]
                };
            }
        }

        if (returnType === 'CDNR' && cdnrInvoices.length > 0) {
            const cdnrMap = new Map<string, any>();
            cdnrInvoices.forEach(note => {
                const ctin = note.gstin;
                if (!cdnrMap.has(ctin)) {
                    cdnrMap.set(ctin, { ctin, nt: [] });
                }
                const party = cdnrMap.get(ctin);
                party.nt.push({
                    nty: note.noteType,
                    nt_num: note.noteNumber,
                    nt_dt: note.noteDate,
                    inum: note.originalInvoiceNumber,
                    idt: note.originalInvoiceDate,
                    val: note.noteValue,
                    p_gst: note.preGst,
                    // inv_typ might be needed here too for older schemas but CDNR usually is separate
                    itms: note.items.map((item, idx) => ({
                        num: idx + 1,
                        itm_det: {
                            rt: item.rate,
                            txval: item.taxableValue,
                            iamt: item.igstAmount,
                            camt: item.cgstAmount,
                            samt: item.sgstAmount,
                            csamt: item.cessAmount
                        }
                    }))
                });
            });
            gstr1.cdnr = Array.from(cdnrMap.values());

            // Note: HSN/Doc Issue not strictly required for CDNR-only files usually, 
            // but if desired, similar logic applies. Keeping it for B2B only for now.
        }

        const dataStr = JSON.stringify(gstr1, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `GSTR1_${gstin}_${filingPeriod}_${returnType}.json`; // appended returnType to filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // Update an error row with new data and attempt to validate
    updateErrorRow: (index: number, data: Record<string, unknown>) => {
        const { errors, b2bInvoices, validationSummary } = get();
        if (index < 0 || index >= errors.length) return false;

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
            const newErrors = [...errors];
            newErrors.splice(index, 1);

            set({
                errors: newErrors,
                b2bInvoices: [...b2bInvoices, newInvoice],
                validationSummary: {
                    ...validationSummary,
                    valid: validationSummary.valid + 1,
                    error: validationSummary.error - 1,
                },
            });
            return true;
        }
        return false;
    },

    // Remove an error row without validating (discard)
    removeError: (index: number) => {
        const { errors, validationSummary } = get();
        if (index < 0 || index >= errors.length) return;

        const newErrors = [...errors];
        newErrors.splice(index, 1);

        set({
            errors: newErrors,
            validationSummary: {
                ...validationSummary,
                total: validationSummary.total - 1,
                error: validationSummary.error - 1,
            },
        });
    },
}));

// Selector hooks
export const useCurrentStep = () => useGSTStore((state) => state.currentStep);
export const useRawFiles = () => useGSTStore((state) => state.rawFiles);
export const useIsProcessing = () => useGSTStore((state) => state.isProcessing);
export const useProcessingError = () => useGSTStore((state) => state.processingError);
export const useReturnType = () => useGSTStore((state) => state.returnType);
export const useValidationSummary = () => useGSTStore((state) => state.validationSummary);
export const useB2BInvoices = () => useGSTStore((state) => state.b2bInvoices);
export const useCDNRInvoices = () => useGSTStore((state) => state.cdnrInvoices);
export const useErrors = () => useGSTStore((state) => state.errors);

