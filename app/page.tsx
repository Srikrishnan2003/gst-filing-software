"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { FileText, IndianRupee, AlertCircle, TrendingUp, Download, RotateCcw, Loader2 } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { ProcessStepper } from "@/components/process-stepper"
import { FileDropzone } from "@/components/file-dropzone"
import { MetricCard } from "@/components/metric-card"
import { ValidationBanner } from "@/components/validation-banner"
// Lazy load heavy components
const InvoiceTable = dynamic(() => import("@/components/invoice-table").then(mod => mod.InvoiceTable), {
  loading: () => <div className="h-64 bg-muted/20 animate-pulse rounded-lg" />
})
const TaxSummary = dynamic(() => import("@/components/tax-summary").then(mod => mod.TaxSummary), {
  loading: () => <div className="h-64 bg-muted/20 animate-pulse rounded-lg" />
})
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
  const uploadFile = useGSTStore((state) => state.uploadFile)
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

  const handleFileSelect = async (file: File) => {
    await uploadFile(file)
  }

  const handleDownload = () => {
    if (gstin && filingPeriod) {
      downloadJSON(gstin, filingPeriod)
      setShowDownloadModal(false)
    }
  }

  // Calculate totals for metric cards
  const { totalTaxableValue, totalTaxAmount, totalCgst, totalSgst, totalIgst } = useMemo(() => {
    return {
      totalTaxableValue: b2bInvoices.reduce((sum, inv) => sum + inv.totalTaxableValue, 0),
      totalTaxAmount: b2bInvoices.reduce((sum, inv) => sum + inv.totalTaxAmount, 0),
      totalCgst: b2bInvoices.reduce((sum, inv) => sum + inv.totalCgst, 0),
      totalSgst: b2bInvoices.reduce((sum, inv) => sum + inv.totalSgst, 0),
      totalIgst: b2bInvoices.reduce((sum, inv) => sum + inv.totalIgst, 0)
    }
  }, [b2bInvoices])

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

  // Add error rows to table for display
  const errorTableData = useMemo(() => errors.map((error, index) => ({
    id: `error-${index}`,
    invoiceNo: String(error.data.invoiceNumber || "Unknown"),
    date: String(error.data.invoiceDate || "Unknown"),
    party: "Unknown",
    gstin: String(error.data.gstin || "Invalid"),
    amount: Number(error.data.taxableValue) || 0,
    taxAmount: 0,
    status: "error" as const,
  })), [errors])

  const hasErrors = errors.length > 0
  const canDownload = b2bInvoices.length > 0 && !hasErrors

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Process Stepper - Always visible */}
        <ProcessStepper currentStep={currentStep} />

        {/* State A: Upload State */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto mt-12">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Processing your file...</p>
                <p className="text-sm text-muted-foreground">
                  Parsing Excel, validating rows, and grouping invoices
                </p>
              </div>
            ) : (
              <>
                <FileDropzone onFileSelect={handleFileSelect} />

                {/* Help Section */}
                <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                  <h3 className="font-semibold text-sm mb-3">📋 How to Use:</h3>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Download the <a href="/GST_Template.xlsx" download className="text-primary underline font-medium">GST Excel Template</a></li>
                    <li>Fill your invoice data in the template (B2B sheet for sales, CDNR for returns)</li>
                    <li>Upload the filled Excel file here</li>
                    <li>Review the parsed data and fix any errors</li>
                    <li>Generate JSON and upload to GST Portal</li>
                  </ol>
                </div>

                {processingError && (
                  <div className="mt-4">
                    <ValidationBanner
                      variant="error"
                      title="Processing Failed"
                      description={processingError}
                    />
                  </div>
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

                {/* Mode Toggle */}
                <div className="flex items-center gap-2 border rounded-lg p-1">
                  <Button
                    variant={returnType === 'B2B' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setReturnType('B2B')}
                    className="gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    B2B Sales
                  </Button>
                  <Button
                    variant={returnType === 'CDNR' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setReturnType('CDNR')}
                    className="gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    CDNR
                  </Button>
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
                    }
                  }}
                />
              </TabsContent>
              <TabsContent value="errors" className="mt-6">
                <InvoiceTable data={errorTableData} />
                {errors.length > 0 && (
                  <div className="mt-4 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                    <h4 className="font-semibold text-destructive mb-2">Error Details:</h4>
                    <ul className="space-y-2 text-sm">
                      {errors.slice(0, 10).map((error, index) => (
                        <li key={index} className="text-muted-foreground">
                          {error.errors.map((err, errIndex) => (
                            <div key={errIndex}>{err}</div>
                          ))}
                        </li>
                      ))}
                      {errors.length > 10 && (
                        <li className="text-muted-foreground italic">
                          ...and {errors.length - 10} more errors
                        </li>
                      )}
                    </ul>
                  </div>
                )}
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
