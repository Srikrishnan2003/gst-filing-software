"use client"

import { useState, useEffect } from "react"
import { X, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { B2BInvoiceRowSchema } from "@/lib/schemas/gst-schema"

interface ErrorRow {
    rowNumber: number
    data: Record<string, unknown>
    errors: string[]
}

interface ErrorEditorProps {
    error: ErrorRow
    index: number
    onSave: (index: number, updatedData: Record<string, unknown>) => void
    onClose: () => void
}

// Field definitions for the form
const FORM_FIELDS = [
    { key: "gstin", label: "GSTIN", placeholder: "29ABCDE1234F1Z5", required: true },
    { key: "receiverName", label: "Receiver Name", placeholder: "Company Name", required: false },
    { key: "invoiceNumber", label: "Invoice Number", placeholder: "INV-001", required: true },
    { key: "invoiceDate", label: "Invoice Date", placeholder: "DD-MM-YYYY", required: true },
    { key: "placeOfSupply", label: "Place of Supply (2-digit)", placeholder: "33", required: true },
    { key: "taxableValue", label: "Taxable Value", placeholder: "10000", required: true, type: "number" },
    { key: "rate", label: "GST Rate (%)", placeholder: "18", required: true, type: "number" },
    { key: "igstAmount", label: "IGST Amount", placeholder: "0", required: false, type: "number" },
    { key: "cgstAmount", label: "CGST Amount", placeholder: "900", required: false, type: "number" },
    { key: "sgstAmount", label: "SGST Amount", placeholder: "900", required: false, type: "number" },
    { key: "cessAmount", label: "Cess Amount", placeholder: "0", required: false, type: "number" },
    { key: "hsnCode", label: "HSN Code", placeholder: "9997", required: false },
]

export function ErrorEditor({ error, index, onSave, onClose }: ErrorEditorProps) {
    const [formData, setFormData] = useState<Record<string, string>>({})
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    const [isSaving, setIsSaving] = useState(false)

    // Initialize form data from error data
    useEffect(() => {
        const initial: Record<string, string> = {}
        FORM_FIELDS.forEach(field => {
            const value = error.data[field.key]
            initial[field.key] = value !== undefined && value !== null ? String(value) : ""
        })
        setFormData(initial)
    }, [error])

    const handleChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }))
        // Clear validation error on change
        if (validationErrors[key]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[key]
                return newErrors
            })
        }
    }

    const handleSave = () => {
        setIsSaving(true)
        setValidationErrors({})

        // Convert form data to proper types
        const processedData: Record<string, unknown> = {}
        FORM_FIELDS.forEach(field => {
            const value = formData[field.key]
            if (field.type === "number") {
                processedData[field.key] = value ? parseFloat(value) : 0
            } else {
                processedData[field.key] = value || undefined
            }
        })

        // Handle reverse charge default
        processedData.reverseCharge = error.data.reverseCharge || "N"
        processedData.invoiceValue = processedData.invoiceValue ||
            (Number(processedData.taxableValue) || 0) +
            (Number(processedData.igstAmount) || 0) +
            (Number(processedData.cgstAmount) || 0) +
            (Number(processedData.sgstAmount) || 0) +
            (Number(processedData.cessAmount) || 0)

        // Validate with Zod
        const result = B2BInvoiceRowSchema.safeParse(processedData)

        if (result.success) {
            onSave(index, result.data as Record<string, unknown>)
            onClose()
        } else {
            const errors: Record<string, string> = {}
            result.error.errors.forEach(err => {
                const field = err.path[0] as string
                errors[field] = err.message
            })
            setValidationErrors(errors)
        }

        setIsSaving(false)
    }

    // Check if a field has an error from original validation
    const hasOriginalError = (fieldKey: string) => {
        return error.errors.some(err => err.toLowerCase().includes(fieldKey.toLowerCase()))
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h3 className="text-lg font-semibold">Edit Error Row {error.rowNumber}</h3>
                        <p className="text-sm text-muted-foreground">
                            Fix the validation errors and save to move to valid invoices
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {FORM_FIELDS.map(field => {
                            const hasError = validationErrors[field.key] || hasOriginalError(field.key)
                            return (
                                <div key={field.key} className="space-y-1.5">
                                    <Label htmlFor={field.key} className="text-sm">
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    <Input
                                        id={field.key}
                                        type={field.type || "text"}
                                        value={formData[field.key] || ""}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        className={hasError ? "border-red-500 focus-visible:ring-red-500" : ""}
                                    />
                                    {validationErrors[field.key] && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {validationErrors[field.key]}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t bg-muted/30">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                        <Check className="h-4 w-4" />
                        Save & Validate
                    </Button>
                </div>
            </div>
        </div>
    )
}
