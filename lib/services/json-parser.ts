import type { B2BInvoice, InvoiceItem } from "@/lib/schemas/gst-schema";

interface GSTR1JSON {
    gstin: string;
    fp: string;
    b2b?: Array<{
        ctin: string;
        cfs?: string;
        inv: Array<{
            inum: string;
            idt: string;
            val: number;
            pos: string;
            rchrg: string;
            inv_typ: string;
            itms: Array<{
                num: number;
                itm_det: {
                    rt: number;
                    txval: number;
                    iamt?: number;
                    camt?: number;
                    samt?: number;
                    csamt?: number;
                };
            }>;
        }>;
    }>;
    cdnr?: Array<{
        ctin: string;
        nt: Array<{
            ntty: string;
            nt_num: string;
            nt_dt: string;
            val: number;
            pos: string;
            rchrg: string;
            itms: Array<{
                num: number;
                itm_det: {
                    rt: number;
                    txval: number;
                    iamt?: number;
                    camt?: number;
                    samt?: number;
                    csamt?: number;
                };
            }>;
        }>;
    }>;
    hsn?: {
        hsn_b2b?: Array<{
            hsn_sc: string;
            desc?: string;
            uqc?: string;
            qty?: number;
            txval: number;
            iamt?: number;
            camt?: number;
            samt?: number;
            csamt?: number;
            rt: number;
        }>;
    };
}

export interface JSONParseResult {
    gstin: string;
    filingPeriod: string;
    b2bInvoices: B2BInvoice[];
    sourceType: 'json';
}

export function parseGSTR1JSON(jsonContent: string): JSONParseResult {
    const data: GSTR1JSON = JSON.parse(jsonContent);

    const b2bInvoices: B2BInvoice[] = [];
    let invoiceId = 1;

    // Parse B2B invoices
    if (data.b2b && Array.isArray(data.b2b)) {
        data.b2b.forEach(party => {
            const ctin = party.ctin;

            party.inv.forEach(inv => {
                // Build items array
                const items: InvoiceItem[] = inv.itms.map(itm => ({
                    rate: itm.itm_det.rt,
                    taxableValue: itm.itm_det.txval,
                    igstAmount: itm.itm_det.iamt || 0,
                    cgstAmount: itm.itm_det.camt || 0,
                    sgstAmount: itm.itm_det.samt || 0,
                    cessAmount: itm.itm_det.csamt || 0,
                    hsnCode: "",
                    description: "",
                    quantity: 0,
                    unit: "OTH"
                }));

                // Calculate totals
                const totalTaxableValue = items.reduce((sum, i) => sum + i.taxableValue, 0);
                const totalIgst = items.reduce((sum, i) => sum + i.igstAmount, 0);
                const totalCgst = items.reduce((sum, i) => sum + i.cgstAmount, 0);
                const totalSgst = items.reduce((sum, i) => sum + i.sgstAmount, 0);
                const totalCess = items.reduce((sum, i) => sum + i.cessAmount, 0);
                const totalTaxAmount = totalIgst + totalCgst + totalSgst + totalCess;

                const invoice: B2BInvoice = {
                    id: `json-b2b-${invoiceId++}`,
                    gstin: ctin,
                    // JSON doesn't contain party names - show GSTIN prefix for identification
                    receiverName: `${ctin.slice(2, 12)}... (${ctin.slice(0, 2)})`,
                    invoiceNumber: inv.inum,
                    invoiceDate: inv.idt,
                    invoiceValue: inv.val,
                    placeOfSupply: inv.pos,
                    reverseCharge: (inv.rchrg || "N") as "Y" | "N",
                    items,
                    totalTaxableValue,
                    totalIgst,
                    totalCgst,
                    totalSgst,
                    totalCess,
                    totalTaxAmount,
                };

                b2bInvoices.push(invoice);
            });
        });
    }

    return {
        gstin: data.gstin,
        filingPeriod: data.fp,
        b2bInvoices,
        sourceType: 'json'
    };
}

export function readJSONFile(file: File): Promise<JSONParseResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const result = parseGSTR1JSON(content);
                resolve(result);
            } catch (error) {
                reject(new Error(`Failed to parse JSON: ${error}`));
            }
        };

        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
}
