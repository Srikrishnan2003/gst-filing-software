"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { FileText, IndianRupee, AlertCircle, TrendingUp, Download, RotateCcw, Loader2, Briefcase, Undo2 } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { ProcessStepper } from "@/components/process-stepper"
import { FileDropzone } from "@/components/file-dropzone"
import { MetricCard } from "@/components/metric-card"
import { ValidationBanner } from "@/components/validation-banner"
// Lazy load heavy components (from friend's changes)
const InvoiceTable = dynamic(() => import("@/components/invoice-table").then(mod => mod.InvoiceTable), {
  loading: () => <div className="h-64 bg-muted/20 animate-pulse rounded-lg" />
})
const TaxSummary = dynamic(() => import("@/components/tax-summary").then(mod => mod.TaxSummary), {
  loading: () => <div className="h-64 bg-muted/20 animate-pulse rounded-lg" />
})
// ErrorDetails component (from your stashed changes)
import { ErrorDetails } from "@/components/error-details"
import { PrintButton } from "@/components/print-summary"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  useGSTStore,
  useCurrentStep,
  useB2BInvoices,
  useErrors,
  useValidationSummary,
  useIsProcessing,
  useProcessingError,
  useReturnType,
} from "@/store/gst-store"

export default function GSTDashboard() {
  const currentStep = useCurrentStep()
  const b2bInvoices = useB2BInvoices()
  const errors = useErrors()
  const validationSummary = useValidationSummary()
  const isProcessing = useIsProcessing()
  const processingError = useProcessingError()

  const returnType = useReturnType()
  const rawFiles = useGSTStore((state) => state.rawFiles) // Updated selector
  const addFiles = useGSTStore((state) => state.addFiles)
  const removeFile = useGSTStore((state) => state.removeFile)
  const processFiles = useGSTStore((state) => state.processFiles)

  const downloadJSON = useGSTStore((state) => state.downloadJSON)
  const reset = useGSTStore((state) => state.reset)
  const setReturnType = useGSTStore((state) => state.setReturnType)

  // Modal state for download options
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [gstin, setGstin] = useState("")
  const [filingPeriod, setFilingPeriod] = useState("")

  // Auto-detect GSTIN and filing period from invoices when modal opens
  const openDownloadModal = () => {
    // Try to detect GSTIN from first invoice's place of supply (it's the supplier's state)
    if (b2bInvoices.length > 0 && !gstin) {
      // Get the most common GSTIN prefix to suggest supplier's state
      const firstInvoice = b2bInvoices[0]
      if (firstInvoice.invoiceDate) {
        // Extract MMYYYY from invoice date (DD-MM-YYYY)
        const parts = firstInvoice.invoiceDate.split("-")
        if (parts.length === 3) {
          const month = parts[1]
          const year = parts[2]
          setFilingPeriod(`${month}${year}`)
        }
      }
    }
    setShowDownloadModal(true)
  }

  const handleProcess = async () => {
    await processFiles()
  }

  const handleDownload = () => {
    if (gstin && filingPeriod) {
      downloadJSON(gstin, filingPeriod)
      setShowDownloadModal(false)
    }
  }

  // Calculate totals for metric cards (memoized from friend's changes)
  const { totalTaxableValue, totalTaxAmount, totalCgst, totalSgst, totalIgst } = useMemo(() => {
    return {
      totalTaxableValue: b2bInvoices.reduce((sum, inv) => sum + inv.totalTaxableValue, 0),
      totalTaxAmount: b2bInvoices.reduce((sum, inv) => sum + inv.totalTaxAmount, 0),
      totalCgst: b2bInvoices.reduce((sum, inv) => sum + inv.totalCgst, 0),
      totalSgst: b2bInvoices.reduce((sum, inv) => sum + inv.totalSgst, 0),
      totalIgst: b2bInvoices.reduce((sum, inv) => sum + inv.totalIgst, 0)
    }
  }, [b2bInvoices])

  // Calculate recipient-based summary (grouped by GSTIN)
  const recipientSummary = (() => {
    const recipientMap = new Map<string, {
      gstin: string
      receiverName?: string
      invoiceCount: number
      taxableValue: number
      cgst: number
      sgst: number
      igst: number
      cess: number
      totalTax: number
    }>()

    b2bInvoices.forEach(inv => {
      const existing = recipientMap.get(inv.gstin)
      if (existing) {
        existing.invoiceCount += 1
        existing.taxableValue += inv.totalTaxableValue
        existing.cgst += inv.totalCgst
        existing.sgst += inv.totalSgst
        existing.igst += inv.totalIgst
        existing.cess += inv.totalCess
        existing.totalTax += inv.totalTaxAmount
        // Update receiver name if not set
        if (!existing.receiverName && inv.receiverName) {
          existing.receiverName = inv.receiverName
        }
      } else {
        recipientMap.set(inv.gstin, {
          gstin: inv.gstin,
          receiverName: inv.receiverName,
          invoiceCount: 1,
          taxableValue: inv.totalTaxableValue,
          cgst: inv.totalCgst,
          sgst: inv.totalSgst,
          igst: inv.totalIgst,
          cess: inv.totalCess,
          totalTax: inv.totalTaxAmount,
        })
      }
    })

    // Sort by taxable value descending
    return Array.from(recipientMap.values()).sort((a, b) => b.taxableValue - a.taxableValue)
  })()

  // Format currency for display
  const formatCurrency = (value: number) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`
    }
    return `₹${value.toLocaleString("en-IN")}`
  }

  // Transform invoices for table display
  const tableData = useMemo(() => b2bInvoices.map((invoice) => ({
    id: invoice.id,
    invoiceNo: invoice.invoiceNumber,
    date: invoice.invoiceDate,
    party: invoice.receiverName || `Customer (${invoice.gstin.slice(0, 2)})`,
    gstin: invoice.gstin,
    amount: invoice.totalTaxableValue,
    taxAmount: invoice.totalTaxAmount,
    status: "valid" as const,
  })), [b2bInvoices])

  // Add error rows to table for display (from friend's enhanced version with duplicate detection)
  const errorTableData = useMemo(() => errors.map((error, index) => {
    // Check if it's a duplicate error
    const isDuplicate = error.errors.some(msg =>
      String(msg).toLowerCase().includes("duplicate")
    );

    // Safely cast data to accessible object
    const d = error.data as any;

    // Resolve Party Name
    const partyName = d.receiverName || d["Receiver Name"] || d["Billing Name"] || d["Party Name"] || "Unknown";

    // Resolve Taxable Value
    const taxable = Number(d.taxableValue || d["Taxable Value"] || 0);

    // Calculate Tax Amount (Sum of components)
    // Keys might be camelCase (if parsed) or Title Case (if raw)
    const igst = Number(d.igstAmount || d["IGST Amount"] || d["Integrated Tax Amount"] || 0);
    const cgst = Number(d.cgstAmount || d["CGST Amount"] || d["Central Tax Amount"] || 0);
    const sgst = Number(d.sgstAmount || d["SGST Amount"] || d["State/UT Tax Amount"] || 0);
    const cess = Number(d.cessAmount || d["Cess Amount"] || 0);

    const taxAmt = igst + cgst + sgst + cess;

    return {
      id: `error-${index}`,
      invoiceNo: String(d.invoiceNumber || d["Invoice No"] || d["Invoice Number"] || "Unknown"),
      date: String(d.invoiceDate || d["Invoice Date"] || "Unknown"),
      party: partyName,
      gstin: String(d.gstin || d["GSTIN"] || "Invalid"),
      amount: taxable,
      taxAmount: taxAmt,
      status: (isDuplicate ? "duplicate" : "error") as "duplicate" | "error",
    }
  }), [errors])

  const hasErrors = errors.length > 0
  const canDownload = b2bInvoices.length > 0 && !hasErrors

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Process Stepper - Always visible */}
        <ProcessStepper currentStep={currentStep} />

        {/* State A: Upload State */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto mt-12 space-y-8">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Processing your files...</p>
                <p className="text-sm text-muted-foreground">
                  Validating invoices and aggregating data...
                </p>
              </div>
            ) : (
              <>
                {/* 1. Dropzone */}
                <FileDropzone onFilesAdded={(files) => addFiles(files)} />

                {/* 2. File Queue */}
                {rawFiles.length > 0 && (
                  <div className="bg-card glass-card rounded-xl p-6 border shadow-sm animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Selected Files ({rawFiles.length})
                      </h3>
                      <Button onClick={handleProcess} size="lg" className="btn-gradient">
                        Process Files
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {rawFiles.map((file, idx) => (
                        <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border group hover:border-primary/30 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border text-muted-foreground">
                              {file.name.endsWith('.csv') ? 'CSV' : 'XLS'}
                            </div>
                            <div>
                              <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-destructive">
                            <span className="sr-only">Remove</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Help Section */}
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <h3 className="font-semibold text-sm mb-3">📋 How to Use:</h3>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Download the <a href="/GST_Template.xlsx" download className="text-primary underline font-medium">GST Excel Template</a></li>
                    <li>Fill your invoice data in the template (B2B sheet for sales, CDNR for returns)</li>
                    <li>Upload multiple Excel/CSV files at once</li>
                    <li>Click <strong>Process Files</strong> to validate everything together</li>
                  </ol>
                </div>

                {processingError && (
                  <ValidationBanner
                    variant="error"
                    title="Processing Failed"
                    description={processingError}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* State B: Review State */}
        {currentStep >= 2 && (
          <div className="space-y-6">
            {/* Action Buttons with Mode Indicator */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
                <Button variant="outline" onClick={reset} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Upload New File
                </Button>

                {/* Mode Toggle (Segmented Control) */}
                <div className="bg-muted/50 p-1 rounded-xl inline-flex items-center">
                  <button
                    onClick={() => setReturnType('B2B')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${returnType === 'B2B'
                      ? "bg-background shadow-sm text-foreground ring-1 ring-black/5 dark:ring-white/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    B2B Sales
                  </button>
                  <button
                    onClick={() => setReturnType('CDNR')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${returnType === 'CDNR'
                      ? "bg-background shadow-sm text-foreground ring-1 ring-black/5 dark:ring-white/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      }`}
                  >
                    <Undo2 className="w-4 h-4" />
                    CDNR
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                {/* Current Mode Badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${returnType === 'B2B'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                  }`}>
                  Model: {returnType === 'B2B' ? 'B2B' : 'CDNR'}
                </span>

                <Button
                  onClick={openDownloadModal}
                  disabled={!canDownload}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Generate {returnType} JSON
                </Button>
              </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Invoices"
                value={String(b2bInvoices.length)}
                icon={FileText}
                description={`Valid: ${validationSummary.valid} | Errors: ${validationSummary.error}`}
              />
              <MetricCard
                title="Tax Liability"
                value={formatCurrency(totalTaxAmount)}
                icon={IndianRupee}
                description={
                  totalIgst > 0
                    ? `IGST: ${formatCurrency(totalIgst)}`
                    : `CGST: ${formatCurrency(totalCgst)} | SGST: ${formatCurrency(totalSgst)}`
                }
              />
              <MetricCard
                title="Validation Status"
                value={hasErrors ? String(errors.length) : "✓"}
                icon={AlertCircle}
                description={hasErrors ? "Rows need attention" : "All rows validated"}
              />
              <MetricCard
                title="Taxable Amount"
                value={formatCurrency(totalTaxableValue)}
                icon={TrendingUp}
                description={`${b2bInvoices.length} grouped invoices`}
              />
            </div>

            {/* Validation Banner */}
            {hasErrors ? (
              <ValidationBanner
                variant="error"
                title={`${errors.length} Validation Error${errors.length > 1 ? "s" : ""} Found`}
                description="Please review the error details below. Fix these in your Excel file and re-upload to proceed."
              />
            ) : (
              <ValidationBanner
                variant="success"
                title="All Invoices Validated Successfully"
                description="Your data is ready to be exported as GSTR-1 JSON."
              />
            )}

            {/* Tabs with Invoice Tables and Summary */}
            <Tabs defaultValue="valid" className="w-full">
              <TabsList className="grid w-full md:max-w-lg grid-cols-3 h-auto">
                <TabsTrigger value="valid">
                  Invoices ({b2bInvoices.length})
                </TabsTrigger>
                <TabsTrigger value="summary">
                  Summary
                </TabsTrigger>
                <TabsTrigger value="errors" disabled={!hasErrors}>
                  Errors ({errors.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="valid" className="mt-6">
                <InvoiceTable data={tableData} />
              </TabsContent>
              <TabsContent value="summary" className="mt-6">
                {/* Print Button */}
                <div className="flex justify-end mb-4">
                  <PrintButton
                    gstin={gstin}
                    filingPeriod={filingPeriod}
                    data={{
                      b2b: {
                        count: b2bInvoices.length,
                        taxableValue: totalTaxableValue,
                        cgst: totalCgst,
                        sgst: totalSgst,
                        igst: totalIgst,
                        cess: b2bInvoices.reduce((sum, inv) => sum + inv.totalCess, 0),
                        total: totalTaxableValue + totalTaxAmount
                      },
                      totals: {
                        invoices: b2bInvoices.length,
                        taxableValue: totalTaxableValue,
                        cgst: totalCgst,
                        sgst: totalSgst,
                        igst: totalIgst,
                        cess: b2bInvoices.reduce((sum, inv) => sum + inv.totalCess, 0),
                        totalTax: totalTaxAmount,
                        grandTotal: totalTaxableValue + totalTaxAmount
                      },
                      recipientSummary: recipientSummary
                    }}
                    disabled={b2bInvoices.length === 0}
                  />
                </div>
                <TaxSummary
                  data={{
                    b2b: {
                      count: b2bInvoices.length,
                      taxableValue: totalTaxableValue,
                      cgst: totalCgst,
                      sgst: totalSgst,
                      igst: totalIgst,
                      cess: b2bInvoices.reduce((sum, inv) => sum + inv.totalCess, 0),
                      total: totalTaxableValue + totalTaxAmount
                    },
                    hsn: [],
                    totals: {
                      invoices: b2bInvoices.length,
                      taxableValue: totalTaxableValue,
                      cgst: totalCgst,
                      sgst: totalSgst,
                      igst: totalIgst,
                      cess: b2bInvoices.reduce((sum, inv) => sum + inv.totalCess, 0),
                      totalTax: totalTaxAmount,
                      grandTotal: totalTaxableValue + totalTaxAmount
                    },
                    recipientSummary: recipientSummary
                  }}
                />
              </TabsContent>
              <TabsContent value="errors" className="mt-6">
                <ErrorDetails errors={errors} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Download Modal */}
        {showDownloadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border rounded-lg p-6 w-full max-w-md space-y-4">
              <h3 className="text-lg font-semibold">Generate GSTR-1 JSON</h3>
              <p className="text-sm text-muted-foreground">
                Enter your GSTIN and filing period to generate the JSON file.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Your GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g., 29ABCDE1234F1Z5"
                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                    maxLength={15}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Filing Period (MMYYYY)</label>
                  <input
                    type="text"
                    value={filingPeriod}
                    onChange={(e) => setFilingPeriod(e.target.value)}
                    placeholder="e.g., 012024"
                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowDownloadModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={!gstin || !filingPeriod || filingPeriod.length !== 6}
                >
                  Download JSON
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
