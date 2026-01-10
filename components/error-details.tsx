"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, AlertCircle, FileWarning, HelpCircle, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ErrorEditor } from "@/components/error-editor"
import { useGSTStore } from "@/store/gst-store"

// Error explanation mapping for user-friendly messages
const ERROR_EXPLANATIONS: Record<string, { title: string; description: string; fix: string }> = {
    "Invalid GSTIN format": {
        title: "Invalid GSTIN Number",
        description: "The GSTIN (GST Identification Number) provided does not match the standard 15-character format. A valid GSTIN looks like: 29ABCDE1234F1Z5",
        fix: "Check that the GSTIN has exactly 15 characters: 2 digits (state code) + 10 characters (PAN) + 1 alphanumeric + 'Z' + 1 check digit. Remove any spaces or special characters."
    },
    "Invoice number is required": {
        title: "Missing Invoice Number",
        description: "Every invoice must have a unique invoice number. This field cannot be empty.",
        fix: "Enter the invoice number from your tax invoice. It should match the number printed on the original invoice document."
    },
    "Invoice number cannot exceed 16 characters": {
        title: "Invoice Number Too Long",
        description: "The GST portal only accepts invoice numbers up to 16 characters.",
        fix: "Shorten the invoice number to 16 characters or less. Remove any prefixes or suffixes that are not essential."
    },
    "Date must be in DD-MM-YYYY format": {
        title: "Invalid Date Format",
        description: "The invoice date is not in the required format. The GST portal expects dates as DD-MM-YYYY (e.g., 15-01-2024).",
        fix: "Reformat the date to DD-MM-YYYY. For January 15, 2024, enter: 15-01-2024. Check for any extra spaces or invalid characters."
    },
    "Invoice value must be positive": {
        title: "Invalid Invoice Value",
        description: "The total invoice value (including tax) must be a positive number greater than zero.",
        fix: "Enter the total invoice amount including all taxes. If this is a credit note, use the CDNR section instead."
    },
    "Place of supply must be a 2-digit state code": {
        title: "Invalid Place of Supply",
        description: "Place of Supply must be a valid 2-digit state code (01-38). This determines whether IGST or CGST+SGST applies.",
        fix: "Enter the 2-digit state code. Common codes: 33 (Tamil Nadu), 29 (Karnataka), 27 (Maharashtra), 07 (Delhi). Check the GST state code list."
    },
    "Taxable value must be positive": {
        title: "Invalid Taxable Value",
        description: "The taxable value (value before tax) must be a positive number. This is the base amount on which GST is calculated.",
        fix: "Enter the invoice amount before adding GST. This cannot be zero or negative for B2B invoices."
    },
    "Rate must be one of: 0, 5, 9, 12, 18, 28": {
        title: "Invalid GST Rate",
        description: "The GST rate must be one of the standard rates: 0%, 5%, 12%, 18%, or 28%. The value 9% is used internally for CGST/SGST split.",
        fix: "Check the HSN/SAC code for your product/service and use the correct GST rate. Most goods and services fall under 5%, 12%, 18%, or 28%."
    },
    "IGST amount cannot be negative": {
        title: "Negative IGST Amount",
        description: "IGST (Integrated GST) amount cannot be a negative number.",
        fix: "Enter a positive IGST amount or zero. For returns/refunds, use a Credit Note (CDNR) instead."
    },
    "CGST amount cannot be negative": {
        title: "Negative CGST Amount",
        description: "CGST (Central GST) amount cannot be a negative number.",
        fix: "Enter a positive CGST amount or zero. For returns/refunds, use a Credit Note (CDNR) instead."
    },
    "SGST amount cannot be negative": {
        title: "Negative SGST Amount",
        description: "SGST (State GST) amount cannot be a negative number.",
        fix: "Enter a positive SGST amount or zero. For returns/refunds, use a Credit Note (CDNR) instead."
    },
    "HSN code must be at least 2 digits": {
        title: "Invalid HSN Code",
        description: "HSN (Harmonized System Nomenclature) code must be at least 2 digits. For turnover above ₹5 crores, 6-digit HSN is mandatory.",
        fix: "Look up the correct HSN/SAC code for your product or service. You can search on the CBIC website or GST portal."
    },
    "Quantity must be positive": {
        title: "Invalid Quantity",
        description: "The quantity of goods/services must be a positive number.",
        fix: "Enter the actual quantity sold. This should match your invoice."
    },
}

// Get user-friendly error info
function getErrorInfo(errorMessage: string): { title: string; description: string; fix: string } {
    // Try exact match first
    if (ERROR_EXPLANATIONS[errorMessage]) {
        return ERROR_EXPLANATIONS[errorMessage]
    }

    // Try partial match
    for (const [key, value] of Object.entries(ERROR_EXPLANATIONS)) {
        if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
            return value
        }
    }

    // Default fallback
    return {
        title: "Validation Error",
        description: errorMessage,
        fix: "Please check the data in your Excel file and ensure it matches the template format."
    }
}

// Parse error string to extract field and message
function parseError(error: string): { field: string; message: string } {
    const parts = error.split(" - ")
    if (parts.length >= 2) {
        return { field: parts[0], message: parts.slice(1).join(" - ") }
    }
    return { field: "Unknown", message: error }
}

interface ErrorRow {
    rowNumber: number
    data: Record<string, unknown>
    errors: string[]
}

interface ErrorDetailsProps {
    errors: ErrorRow[]
}

function SingleErrorRow({ error, index, onEdit }: { error: ErrorRow; index: number; onEdit: (index: number) => void }) {
    const [isExpanded, setIsExpanded] = useState(false)

    // Generate high-level summary
    const errorCount = error.errors.length
    const firstError = parseError(error.errors[0])
    const invoiceNo = error.data.invoiceNumber || error.data["Invoice No"] || "Unknown"
    const gstin = error.data.gstin || error.data["GSTIN"] || "Unknown"

    return (
        <div className="border rounded-lg overflow-hidden bg-card">
            {/* Collapsed Header - High Level Error */}
            <div className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left">
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                >
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}

                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">Row {error.rowNumber}</span>
                            <span className="text-muted-foreground text-sm">•</span>
                            <span className="text-sm text-muted-foreground truncate">
                                Invoice: {String(invoiceNo).slice(0, 16)}
                            </span>
                            <span className="text-muted-foreground text-sm">•</span>
                            <span className="text-sm text-muted-foreground font-mono truncate">
                                {String(gstin).slice(0, 15)}
                            </span>
                        </div>
                        <div className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                            {errorCount === 1 ? (
                                <span>{getErrorInfo(firstError.message).title}</span>
                            ) : (
                                <span>{errorCount} validation errors found</span>
                            )}
                        </div>
                    </div>

                    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full flex-shrink-0">
                        {errorCount} {errorCount === 1 ? "error" : "errors"}
                    </span>
                </div>

                {/* Edit Button - outside the clickable area */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(index)}
                    className="gap-1 flex-shrink-0"
                >
                    <Pencil className="h-3 w-3" />
                    Edit
                </Button>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="border-t bg-muted/20 px-4 py-3 space-y-4">
                    {error.errors.map((err, errIndex) => {
                        const { field, message } = parseError(err)
                        const info = getErrorInfo(message)

                        return (
                            <div key={errIndex} className="bg-background rounded-lg p-4 border">
                                <div className="flex items-start gap-3">
                                    <FileWarning className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 space-y-2">
                                        {/* Error Title with Field */}
                                        <div>
                                            <span className="font-semibold text-foreground">{info.title}</span>
                                            {field !== "Unknown" && (
                                                <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                                    Field: {field}
                                                </span>
                                            )}
                                        </div>

                                        {/* Current Value */}
                                        {field !== "Unknown" && error.data[field] !== undefined && (
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">Current value: </span>
                                                <code className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded text-xs">
                                                    {String(error.data[field]) || "(empty)"}
                                                </code>
                                            </div>
                                        )}

                                        {/* Description */}
                                        <p className="text-sm text-muted-foreground">
                                            {info.description}
                                        </p>

                                        {/* How to Fix */}
                                        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                            <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">How to fix</span>
                                                <p className="text-sm text-blue-800 dark:text-blue-200 mt-0.5">
                                                    {info.fix}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {/* Raw Data Preview */}
                    <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View raw row data
                        </summary>
                        <pre className="mt-2 bg-muted p-2 rounded overflow-x-auto text-xs">
                            {JSON.stringify(error.data, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    )
}

export function ErrorDetails({ errors }: ErrorDetailsProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const updateErrorRow = useGSTStore((state) => state.updateErrorRow)

    if (errors.length === 0) return null

    const handleEdit = (index: number) => {
        setEditingIndex(index)
    }

    const handleSave = (index: number, updatedData: Record<string, unknown>) => {
        updateErrorRow(index, updatedData)
        setEditingIndex(null)
    }

    const handleCloseEditor = () => {
        setEditingIndex(null)
    }

    return (
        <div className="space-y-3">
            {/* Summary Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <h3 className="font-semibold text-lg">
                        {errors.length} {errors.length === 1 ? "Row" : "Rows"} with Errors
                    </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                    Click on each row to see detailed error information
                </p>
            </div>

            {/* Error List */}
            <div className="space-y-2">
                {errors.map((error, index) => (
                    <SingleErrorRow
                        key={`error-${error.rowNumber}-${index}`}
                        error={error}
                        index={index}
                        onEdit={handleEdit}
                    />
                ))}
            </div>

            {/* Error Editor Modal */}
            {editingIndex !== null && errors[editingIndex] && (
                <ErrorEditor
                    error={errors[editingIndex]}
                    index={editingIndex}
                    onSave={handleSave}
                    onClose={handleCloseEditor}
                />
            )}

            {/* Help Text */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <div>
                        <h4 className="font-medium text-amber-800 dark:text-amber-200">Need Help?</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Fix the errors in your Excel file and re-upload. You can download our
                            <a href="/GST_Template.xlsx" download className="underline font-medium ml-1">
                                GST Template
                            </a>
                            {" "}for the correct format.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
