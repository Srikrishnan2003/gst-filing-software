"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

// Recipient-based summary type
interface RecipientSummary {
    gstin: string
    receiverName?: string
    invoiceCount: number
    taxableValue: number
    cgst: number
    sgst: number
    igst: number
    cess: number
    totalTax: number
}

interface PrintSummaryData {
    b2b: {
        count: number
        taxableValue: number
        cgst: number
        sgst: number
        igst: number
        cess: number
        total: number
    }
    totals: {
        invoices: number
        taxableValue: number
        cgst: number
        sgst: number
        igst: number
        cess: number
        totalTax: number
        grandTotal: number
    }
    recipientSummary?: RecipientSummary[]
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value)
}

// Generate HTML content for printing
function generatePrintHTML(gstin: string, filingPeriod: string, data: PrintSummaryData): string {
    const recipientRows = data.recipientSummary?.map(r => `
        <tr>
            <td style="border: 1px solid #333; padding: 8px; font-family: monospace; font-size: 12px;">${r.gstin}</td>
            <td style="border: 1px solid #333; padding: 8px; max-width: 120px;">${r.receiverName || '-'}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: right;">${r.invoiceCount}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(r.taxableValue)}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(r.igst)}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(r.cgst)}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(r.sgst)}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(r.totalTax)}</td>
        </tr>
    `).join('') || ''

    const recipientSection = data.recipientSummary && data.recipientSummary.length > 0 ? `
        <div style="margin-bottom: 24px;">
            <h2 style="font-size: 18px; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 12px;">
                Recipient-wise Summary (${data.recipientSummary.length} Recipients)
            </h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background-color: #f0f0f0;">
                        <th style="border: 1px solid #333; padding: 8px; text-align: left;">GSTIN</th>
                        <th style="border: 1px solid #333; padding: 8px; text-align: left;">Recipient Name</th>
                        <th style="border: 1px solid #333; padding: 8px; text-align: right;">Invoices</th>
                        <th style="border: 1px solid #333; padding: 8px; text-align: right;">Taxable Value</th>
                        <th style="border: 1px solid #333; padding: 8px; text-align: right;">IGST</th>
                        <th style="border: 1px solid #333; padding: 8px; text-align: right;">CGST</th>
                        <th style="border: 1px solid #333; padding: 8px; text-align: right;">SGST</th>
                        <th style="border: 1px solid #333; padding: 8px; text-align: right;">Total Tax</th>
                    </tr>
                </thead>
                <tbody>
                    ${recipientRows}
                    <tr style="background-color: #f0f0f0; font-weight: bold;">
                        <td style="border: 1px solid #333; padding: 8px;" colspan="2">Total</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: right;">${data.totals.invoices}</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(data.totals.taxableValue)}</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(data.totals.igst)}</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(data.totals.cgst)}</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(data.totals.sgst)}</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(data.totals.totalTax)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    ` : ''

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>GSTR-1 Summary Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            color: #000;
            background: #fff;
        }
        @media print {
            body { padding: 20px; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">GSTR-1 Summary Report</h1>
        <p style="font-size: 16px;">
            ${gstin ? `<span style="font-family: monospace;">GSTIN: ${gstin}</span>` : ''}
            ${filingPeriod ? `<span style="margin-left: 32px;">Filing Period: ${filingPeriod}</span>` : ''}
        </p>
        <p style="font-size: 12px; color: #666; margin-top: 4px;">
            Generated on: ${new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}
        </p>
    </div>

    <!-- Summary Cards -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
        <div style="border: 1px solid #333; padding: 12px; text-align: center;">
            <div style="font-size: 14px; color: #666;">Total Invoices</div>
            <div style="font-size: 24px; font-weight: bold;">${data.totals.invoices}</div>
        </div>
        <div style="border: 1px solid #333; padding: 12px; text-align: center;">
            <div style="font-size: 14px; color: #666;">Taxable Value</div>
            <div style="font-size: 18px; font-weight: bold;">${formatCurrency(data.totals.taxableValue)}</div>
        </div>
        <div style="border: 1px solid #333; padding: 12px; text-align: center;">
            <div style="font-size: 14px; color: #666;">Total Tax</div>
            <div style="font-size: 18px; font-weight: bold;">${formatCurrency(data.totals.totalTax)}</div>
        </div>
        <div style="border: 1px solid #333; padding: 12px; text-align: center;">
            <div style="font-size: 14px; color: #666;">Grand Total</div>
            <div style="font-size: 18px; font-weight: bold;">${formatCurrency(data.totals.grandTotal)}</div>
        </div>
    </div>

    <!-- Tax Breakdown Table -->
    <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 12px;">Tax Liability Breakdown</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background-color: #f0f0f0;">
                    <th style="border: 1px solid #333; padding: 8px; text-align: left;">Tax Type</th>
                    <th style="border: 1px solid #333; padding: 8px; text-align: right;">Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border: 1px solid #333; padding: 8px;">Integrated Tax (IGST)</td>
                    <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(data.totals.igst)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #333; padding: 8px;">Central Tax (CGST)</td>
                    <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(data.totals.cgst)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #333; padding: 8px;">State/UT Tax (SGST)</td>
                    <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(data.totals.sgst)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #333; padding: 8px;">Cess</td>
                    <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(data.totals.cess)}</td>
                </tr>
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                    <td style="border: 1px solid #333; padding: 8px;">Total Tax Liability</td>
                    <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(data.totals.totalTax)}</td>
                </tr>
            </tbody>
        </table>
    </div>

    ${recipientSection}

    <!-- Footer -->
    <div style="border-top: 1px solid #333; padding-top: 16px; margin-top: 32px; text-align: center; font-size: 12px; color: #666;">
        <p>This is a computer-generated document. No signature required.</p>
        <p style="margin-top: 4px;">GST Filing App - For official filing, upload the JSON to GST Portal.</p>
    </div>

    <script>
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>
    `
}

// Print function that opens a new window
export function printSummary(gstin: string, filingPeriod: string, data: PrintSummaryData) {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (printWindow) {
        printWindow.document.write(generatePrintHTML(gstin, filingPeriod, data))
        printWindow.document.close()
    }
}

// Print Button Component
interface PrintButtonProps {
    gstin?: string
    filingPeriod?: string
    data: PrintSummaryData
    disabled?: boolean
}

export function PrintButton({ gstin = '', filingPeriod = '', data, disabled }: PrintButtonProps) {
    const handlePrint = () => {
        printSummary(gstin, filingPeriod, data)
    }

    return (
        <Button
            variant="outline"
            onClick={handlePrint}
            disabled={disabled}
            className="gap-2"
        >
            <Printer className="w-4 h-4" />
            Print Summary
        </Button>
    )
}
