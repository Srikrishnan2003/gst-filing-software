/**
 * Excel Export Utility
 * Exports filtered invoice data to Excel format with colorful styling
 */

import { type B2BInvoice } from "@/lib/schemas/gst-schema"

// Column headers matching the EXACT template structure and order
const HEADERS = [
    "Invoice Date",
    "Invoice No.",
    "Billing Name",
    "Billing GSTIN",
    "Place of Supply",
    "P/S",
    "Item Description",
    "HSN Code",
    "Qty",
    "Unit",
    "Taxable Value",
    "CGST %",
    "CGST Amt",
    "SGST %",
    "SGST Amt",
    "IGST %",
    "IGST Amt",
    "Rev Chg",
    "Rate %",
    "Total Value"
]

// Style definitions
const STYLES = {
    header: {
        fill: { fgColor: { rgb: "1F4E79" } }, // Dark blue
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        }
    },
    totals: {
        fill: { fgColor: { rgb: "FFC000" } }, // Orange/Gold
        font: { bold: true, sz: 11 },
        alignment: { horizontal: "right" },
        border: {
            top: { style: "medium", color: { rgb: "000000" } },
            bottom: { style: "medium", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        }
    },
    data: {
        fill: { fgColor: { rgb: "FFFFFF" } },
        font: { sz: 10 },
        border: {
            top: { style: "thin", color: { rgb: "D9D9D9" } },
            bottom: { style: "thin", color: { rgb: "D9D9D9" } },
            left: { style: "thin", color: { rgb: "D9D9D9" } },
            right: { style: "thin", color: { rgb: "D9D9D9" } }
        }
    },
    dataAlt: {
        fill: { fgColor: { rgb: "F2F2F2" } }, // Light gray for alternate rows
        font: { sz: 10 },
        border: {
            top: { style: "thin", color: { rgb: "D9D9D9" } },
            bottom: { style: "thin", color: { rgb: "D9D9D9" } },
            left: { style: "thin", color: { rgb: "D9D9D9" } },
            right: { style: "thin", color: { rgb: "D9D9D9" } }
        }
    },
    number: {
        numFmt: "#,##0.00"
    },
    summaryHeader: {
        fill: { fgColor: { rgb: "4472C4" } }, // Blue
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
        alignment: { horizontal: "center" }
    },
    summaryTotal: {
        fill: { fgColor: { rgb: "70AD47" } }, // Green
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
        border: {
            top: { style: "medium", color: { rgb: "000000" } },
            bottom: { style: "medium", color: { rgb: "000000" } }
        }
    }
}

// Calculate totals for all invoices
function calculateTotals(invoices: B2BInvoice[]) {
    let totalTransactionValue = 0
    let totalTaxableValue = 0
    let totalIgst = 0
    let totalCgst = 0
    let totalSgst = 0
    let totalCess = 0
    let totalQuantity = 0
    let itemCount = 0

    invoices.forEach(inv => {
        inv.items.forEach(item => {
            totalTransactionValue += inv.invoiceValue
            totalTaxableValue += item.taxableValue
            totalIgst += item.igstAmount
            totalCgst += item.cgstAmount
            totalSgst += item.sgstAmount
            totalCess += item.cessAmount
            totalQuantity += item.quantity || 0
            itemCount++
        })
    })

    return {
        totalTransactionValue,
        totalTaxableValue,
        totalIgst,
        totalCgst,
        totalSgst,
        totalCess,
        totalQuantity,
        invoiceCount: invoices.length,
        itemCount
    }
}

// Helper to set cell with style
function setCellWithStyle(ws: any, cellRef: string, value: any, style: any, XLSX: any) {
    ws[cellRef] = {
        v: value,
        t: typeof value === 'number' ? 'n' : 's',
        s: style
    }
    // Add number formatting for numeric cells
    if (typeof value === 'number' && style !== STYLES.header) {
        ws[cellRef].s = { ...style, numFmt: "#,##0.00" }
    }
}

export async function exportToExcel(
    invoices: B2BInvoice[],
    filename: string = "GST_Invoices_Export"
): Promise<void> {
    // Dynamic import xlsx-js-style for styling support
    const XLSX = await import("xlsx-js-style")

    // Calculate totals
    const totals = calculateTotals(invoices)

    // Create worksheet
    const ws: any = {}
    let row = 1

    // Row 1: Headers with blue background
    HEADERS.forEach((header, col) => {
        const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col })
        setCellWithStyle(ws, cellRef, header, STYLES.header, XLSX)
    })
    row++

    // Row 2: Totals row with orange/gold background (matching new column order)
    // Calculate total value (taxable + all taxes)
    const grandTotal = totals.totalTaxableValue + totals.totalCgst + totals.totalSgst + totals.totalIgst + totals.totalCess
    const totalsRowData = [
        "TOTAL",                        // Invoice Date
        `${totals.invoiceCount} Inv`,   // Invoice No.
        `${totals.itemCount} Items`,    // Billing Name
        "",                             // Billing GSTIN
        "",                             // Place of Supply
        "",                             // P/S
        "",                             // Item Description
        "",                             // HSN Code
        totals.totalQuantity,           // Qty
        "",                             // Unit
        totals.totalTaxableValue,       // Taxable Value
        "",                             // CGST %
        totals.totalCgst,               // CGST Amt
        "",                             // SGST %
        totals.totalSgst,               // SGST Amt
        "",                             // IGST %
        totals.totalIgst,               // IGST Amt
        "",                             // Rev Chg
        "",                             // Rate %
        grandTotal                      // Total Value
    ]
    totalsRowData.forEach((value, col) => {
        const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col })
        setCellWithStyle(ws, cellRef, value, STYLES.totals, XLSX)
    })
    row++

    // Row 3: Empty separator
    row++

    // Data rows with alternating colors (matching new column order)
    let dataRowIndex = 0
    invoices.forEach(inv => {
        inv.items.forEach(item => {
            // Calculate rates from amounts (rate = amount / taxable * 100)
            const cgstRate = item.taxableValue > 0 ? (item.cgstAmount / item.taxableValue) * 100 : 0
            const sgstRate = item.taxableValue > 0 ? (item.sgstAmount / item.taxableValue) * 100 : 0
            const igstRate = item.taxableValue > 0 ? (item.igstAmount / item.taxableValue) * 100 : 0
            const totalValue = inv.invoiceValue

            const rowData = [
                inv.invoiceDate,                    // Invoice Date
                inv.invoiceNumber,                  // Invoice No.
                inv.receiverName || "",             // Billing Name
                inv.gstin,                          // Billing GSTIN
                inv.placeOfSupply,                  // Place of Supply
                "P",                                // P/S (P for Product, S for Service)
                item.description || "",             // Item Description
                item.hsnCode || "",                 // HSN Code
                item.quantity || 0,                 // Qty
                item.unit || "NOS",                 // Unit
                item.taxableValue,                  // Taxable Value
                cgstRate > 0 ? cgstRate : "",       // CGST %
                item.cgstAmount > 0 ? item.cgstAmount : "", // CGST Amt
                sgstRate > 0 ? sgstRate : "",       // SGST %
                item.sgstAmount > 0 ? item.sgstAmount : "", // SGST Amt
                igstRate > 0 ? igstRate : "",       // IGST %
                item.igstAmount > 0 ? item.igstAmount : "", // IGST Amt
                inv.reverseCharge,                  // Rev Chg
                item.rate,                          // Rate %
                totalValue                          // Total Value
            ]

            const style = dataRowIndex % 2 === 0 ? STYLES.data : STYLES.dataAlt
            rowData.forEach((value, col) => {
                const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col })
                setCellWithStyle(ws, cellRef, value, style, XLSX)
            })
            row++
            dataRowIndex++
        })
    })

    // Set worksheet range
    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: HEADERS.length - 1 } })

    // Set column widths (matching new column order)
    ws["!cols"] = [
        { wch: 12 }, // Invoice Date
        { wch: 15 }, // Invoice No.
        { wch: 20 }, // Billing Name
        { wch: 18 }, // Billing GSTIN
        { wch: 15 }, // Place of Supply
        { wch: 5 },  // P/S
        { wch: 25 }, // Item Description
        { wch: 10 }, // HSN Code
        { wch: 8 },  // Qty
        { wch: 8 },  // Unit
        { wch: 14 }, // Taxable Value
        { wch: 8 },  // CGST %
        { wch: 12 }, // CGST Amt
        { wch: 8 },  // SGST %
        { wch: 12 }, // SGST Amt
        { wch: 8 },  // IGST %
        { wch: 12 }, // IGST Amt
        { wch: 8 },  // Rev Chg
        { wch: 8 },  // Rate %
        { wch: 14 }, // Total Value
    ]

    // Set row heights
    ws["!rows"] = [
        { hpt: 30 }, // Header row
        { hpt: 25 }, // Totals row
    ]

    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "B2B Invoices")

    // Add Tax Summary sheet with styling
    const summaryWs = createStyledTaxSummarySheet(invoices, totals, XLSX)
    XLSX.utils.book_append_sheet(wb, summaryWs, "Tax Summary")

    // Add Recipient Summary sheet with styling
    const recipientWs = createStyledRecipientSheet(invoices, XLSX)
    XLSX.utils.book_append_sheet(wb, recipientWs, "Recipient Summary")

    // Generate file and trigger download
    const timestamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`)
}

// Create styled Tax Summary sheet
function createStyledTaxSummarySheet(invoices: B2BInvoice[], totals: ReturnType<typeof calculateTotals>, XLSX: any) {
    const ws: any = {}
    let row = 1

    // Title row
    const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 })
    ws[titleRef] = { v: "GST TAX SUMMARY REPORT", s: { ...STYLES.summaryHeader, font: { ...STYLES.summaryHeader.font, sz: 16 } } }
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }]
    row++

    // Date
    const dateRef = XLSX.utils.encode_cell({ r: 1, c: 0 })
    ws[dateRef] = { v: "Generated: " + new Date().toLocaleDateString('en-IN'), s: { font: { italic: true, sz: 10 } } }
    row += 2

    // Overview section
    const overviewData = [
        ["OVERVIEW", "", ""],
        ["Total Invoices", totals.invoiceCount, ""],
        ["Total Line Items", totals.itemCount, ""],
        ["Unique Customers", new Set(invoices.map(i => i.gstin)).size, ""],
        ["", "", ""],
        ["TAX BREAKDOWN", "Amount (₹)", ""],
        ["Taxable Value", totals.totalTaxableValue, ""],
        ["IGST", totals.totalIgst, ""],
        ["CGST", totals.totalCgst, ""],
        ["SGST", totals.totalSgst, ""],
        ["Cess", totals.totalCess, ""],
        ["", "", ""],
    ]

    overviewData.forEach((rowData, idx) => {
        rowData.forEach((value, col) => {
            const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col })
            let style = STYLES.data
            if (idx === 0 || idx === 5) {
                style = { ...STYLES.header, fill: { fgColor: { rgb: "4472C4" } } }
            }
            if (value !== "") {
                ws[cellRef] = {
                    v: value,
                    t: typeof value === 'number' ? 'n' : 's',
                    s: typeof value === 'number' ? { ...style, numFmt: "#,##0.00" } : style
                }
            }
        })
        row++
    })

    // Grand Total row
    const totalTax = totals.totalIgst + totals.totalCgst + totals.totalSgst + totals.totalCess
    const grandTotalData = [
        ["TOTAL TAX", totalTax, ""],
        ["GRAND TOTAL", totals.totalTaxableValue + totalTax, ""]
    ]

    grandTotalData.forEach((rowData) => {
        rowData.forEach((value, col) => {
            const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col })
            if (value !== "") {
                ws[cellRef] = {
                    v: value,
                    t: typeof value === 'number' ? 'n' : 's',
                    s: typeof value === 'number' ? { ...STYLES.summaryTotal, numFmt: "#,##0.00" } : STYLES.summaryTotal
                }
            }
        })
        row++
    })

    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: 2 } })
    ws["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 15 }]

    return ws
}

// Create styled Recipient Summary sheet
function createStyledRecipientSheet(invoices: B2BInvoice[], XLSX: any) {
    const ws: any = {}

    const headers = ["GSTIN", "Recipient Name", "Invoices", "Taxable Value", "IGST", "CGST", "SGST", "Total Tax"]

    // Header row
    headers.forEach((header, col) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
        setCellWithStyle(ws, cellRef, header, STYLES.header, XLSX)
    })

    // Group by GSTIN
    const recipientMap = new Map<string, {
        name: string
        count: number
        taxable: number
        igst: number
        cgst: number
        sgst: number
    }>()

    invoices.forEach(inv => {
        const existing = recipientMap.get(inv.gstin)
        if (existing) {
            existing.count++
            existing.taxable += inv.totalTaxableValue
            existing.igst += inv.totalIgst
            existing.cgst += inv.totalCgst
            existing.sgst += inv.totalSgst
        } else {
            recipientMap.set(inv.gstin, {
                name: inv.receiverName || "-",
                count: 1,
                taxable: inv.totalTaxableValue,
                igst: inv.totalIgst,
                cgst: inv.totalCgst,
                sgst: inv.totalSgst
            })
        }
    })

    // Sort by taxable value descending
    const sorted = Array.from(recipientMap.entries())
        .sort((a, b) => b[1].taxable - a[1].taxable)

    // Add data rows
    let row = 1
    sorted.forEach(([gstin, r], idx) => {
        const rowData = [gstin, r.name, r.count, r.taxable, r.igst, r.cgst, r.sgst, r.igst + r.cgst + r.sgst]
        const style = idx % 2 === 0 ? STYLES.data : STYLES.dataAlt
        rowData.forEach((value, col) => {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
            setCellWithStyle(ws, cellRef, value, style, XLSX)
        })
        row++
    })

    // Totals row
    row++ // Empty separator
    const totalRow = sorted.reduce((acc, [, r]) => ({
        count: acc.count + r.count,
        taxable: acc.taxable + r.taxable,
        igst: acc.igst + r.igst,
        cgst: acc.cgst + r.cgst,
        sgst: acc.sgst + r.sgst
    }), { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 })

    const totalsData = ["TOTAL", "", totalRow.count, totalRow.taxable, totalRow.igst, totalRow.cgst, totalRow.sgst, totalRow.igst + totalRow.cgst + totalRow.sgst]
    totalsData.forEach((value, col) => {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
        setCellWithStyle(ws, cellRef, value, STYLES.totals, XLSX)
    })
    row++

    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: headers.length - 1 } })
    ws["!cols"] = [
        { wch: 18 }, { wch: 25 }, { wch: 10 }, { wch: 14 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }
    ]

    return ws
}

// Export filtered data with custom sheet name
export async function exportFilteredToExcel(
    invoices: B2BInvoice[],
    filterDescription: string = ""
): Promise<void> {
    const filename = filterDescription
        ? `GST_Filtered_${filterDescription.replace(/\s+/g, "_")}`
        : "GST_Filtered_Export"

    await exportToExcel(invoices, filename)
}
