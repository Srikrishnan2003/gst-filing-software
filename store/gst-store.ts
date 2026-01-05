import { create } from "zustand";
import { type B2BInvoice, type ErrorRow, type ValidationSummary, type GSTR1B2BFormat } from "@/lib/schemas/gst-schema";
import { type CDNRInvoice } from "@/lib/schemas/cdnr-schema";
import { processExcelFile, type ProcessingResult } from "@/lib/services/excel-processor";
import { readJSONFile } from "@/lib/services/json-parser";

interface GSTStore {
    // Step management
    currentStep: number;
    setStep: (step: number) => void;

    // File processing state
    rawFile: File | null;
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
    uploadFile: (file: File) => Promise<void>;
    processFile: () => Promise<void>;
    reset: () => void;
    downloadJSON: (gstin: string, filingPeriod: string) => void;
}

export const useGSTStore = create<GSTStore>((set, get) => ({
    currentStep: 1,
    rawFile: null,
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

    uploadFile: async (file) => {
        const isJSON = file.name.toLowerCase().endsWith('.json');
        set({ rawFile: file, sourceType: isJSON ? 'json' : 'excel', currentStep: 2 });

        if (isJSON) {
            // Handle JSON file directly
            set({ isProcessing: true, processingError: null });
            try {
                const result = await readJSONFile(file);
                set({
                    b2bInvoices: result.b2bInvoices,
                    cdnrInvoices: [],
                    errors: [],
                    validationSummary: {
                        valid: result.b2bInvoices.length,
                        error: 0,
                        total: result.b2bInvoices.length
                    },
                    isProcessing: false,
                    returnType: 'B2B',
                });
            } catch (error) {
                set({
                    isProcessing: false,
                    processingError: error instanceof Error ? error.message : "Failed to parse JSON",
                });
            }
        } else {
            // Handle Excel file
            await get().processFile();
        }
    },

    processFile: async () => {
        const { rawFile, returnType } = get();
        if (!rawFile) return;

        set({ isProcessing: true, processingError: null });

        try {
            // Pass the returnType (B2B or CDNR) to the processor
            const result: ProcessingResult = await processExcelFile(rawFile, returnType);

            if (returnType === 'B2B') {
                set({
                    b2bInvoices: result.invoices as B2BInvoice[], // Type casting based on context
                    cdnrInvoices: [],
                    errors: result.errors,
                    validationSummary: result.summary,
                    isProcessing: false,
                });
            } else {
                set({
                    b2bInvoices: [],
                    cdnrInvoices: result.invoices as CDNRInvoice[],
                    errors: result.errors,
                    validationSummary: result.summary,
                    isProcessing: false,
                });
            }

        } catch (error) {
            console.error("Processing failed:", error);
            set({
                isProcessing: false,
                processingError: error instanceof Error ? error.message : "Failed to process file",
            });
        }
    },

    reset: () => {
        set({
            currentStep: 1,
            rawFile: null,
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
    }
}));

// Selector hooks
export const useCurrentStep = () => useGSTStore((state) => state.currentStep);
export const useRawFile = () => useGSTStore((state) => state.rawFile);
export const useIsProcessing = () => useGSTStore((state) => state.isProcessing);
export const useProcessingError = () => useGSTStore((state) => state.processingError);
export const useReturnType = () => useGSTStore((state) => state.returnType);
export const useValidationSummary = () => useGSTStore((state) => state.validationSummary);
export const useB2BInvoices = () => useGSTStore((state) => state.b2bInvoices);
export const useCDNRInvoices = () => useGSTStore((state) => state.cdnrInvoices);
export const useErrors = () => useGSTStore((state) => state.errors);

