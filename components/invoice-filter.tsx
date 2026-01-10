"use client"

import { useState } from "react"
import { Search, X, Filter, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface InvoiceFilters {
    searchQuery: string        // Search by invoice number, GSTIN, receiver name
    dateFrom: string           // Filter from date (DD-MM-YYYY)
    dateTo: string             // Filter to date (DD-MM-YYYY)
    minAmount: string          // Minimum taxable value
    maxAmount: string          // Maximum taxable value
    gstRate: string            // Filter by GST rate (5, 12, 18, 28, or 'all')
    placeOfSupply: string      // Filter by state code
}

export const defaultFilters: InvoiceFilters = {
    searchQuery: "",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
    gstRate: "all",
    placeOfSupply: "",
}

interface InvoiceFilterProps {
    filters: InvoiceFilters
    onFiltersChange: (filters: InvoiceFilters) => void
    onClearFilters: () => void
    resultCount: number
    totalCount: number
}

export function InvoiceFilter({
    filters,
    onFiltersChange,
    onClearFilters,
    resultCount,
    totalCount,
}: InvoiceFilterProps) {
    const [showAdvanced, setShowAdvanced] = useState(false)

    const hasActiveFilters =
        filters.searchQuery !== "" ||
        filters.dateFrom !== "" ||
        filters.dateTo !== "" ||
        filters.minAmount !== "" ||
        filters.maxAmount !== "" ||
        filters.gstRate !== "all" ||
        filters.placeOfSupply !== ""

    const updateFilter = <K extends keyof InvoiceFilters>(key: K, value: InvoiceFilters[K]) => {
        onFiltersChange({ ...filters, [key]: value })
    }

    return (
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            {/* Main Search Bar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by Invoice No, GSTIN, or Receiver Name..."
                        value={filters.searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("searchQuery", e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={showAdvanced ? "bg-primary/10" : ""}
                >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                </Button>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={onClearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Clear
                    </Button>
                )}
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                    {/* Date Range */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">From Date</label>
                        <div className="relative">
                            <CalendarDays className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="DD-MM-YYYY"
                                value={filters.dateFrom}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("dateFrom", e.target.value)}
                                className="pl-7 h-8 text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">To Date</label>
                        <div className="relative">
                            <CalendarDays className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="DD-MM-YYYY"
                                value={filters.dateTo}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("dateTo", e.target.value)}
                                className="pl-7 h-8 text-sm"
                            />
                        </div>
                    </div>

                    {/* Amount Range */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Min Amount (₹)</label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={filters.minAmount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("minAmount", e.target.value)}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Max Amount (₹)</label>
                        <Input
                            type="number"
                            placeholder="∞"
                            value={filters.maxAmount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("maxAmount", e.target.value)}
                            className="h-8 text-sm"
                        />
                    </div>

                    {/* GST Rate */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">GST Rate</label>
                        <select
                            value={filters.gstRate}
                            onChange={(e) => updateFilter("gstRate", e.target.value)}
                            className="w-full h-8 text-sm rounded-md border border-input bg-background px-2"
                        >
                            <option value="all">All Rates</option>
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                        </select>
                    </div>

                    {/* Place of Supply */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Place of Supply</label>
                        <Input
                            type="text"
                            placeholder="State Code (e.g., 29)"
                            value={filters.placeOfSupply}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("placeOfSupply", e.target.value)}
                            className="h-8 text-sm"
                            maxLength={2}
                        />
                    </div>
                </div>
            )}

            {/* Results Count */}
            {hasActiveFilters && (
                <div className="text-sm text-muted-foreground pt-2 border-t">
                    Showing <span className="font-medium text-foreground">{resultCount}</span> of {totalCount} invoices
                </div>
            )}
        </div>
    )
}

// Helper function to parse DD-MM-YYYY date string to Date object for comparison
export function parseInvoiceDate(dateStr: string): Date | null {
    if (!dateStr) return null
    const parts = dateStr.split("-")
    if (parts.length !== 3) return null
    const [day, month, year] = parts.map(Number)
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null
    return new Date(year, month - 1, day)
}

// Filter function to apply filters to invoice list
export function applyInvoiceFilters<T extends {
    gstin: string
    receiverName?: string
    invoiceNumber: string
    invoiceDate: string
    totalTaxableValue: number
    placeOfSupply: string
    items: Array<{ rate: number }>
}>(invoices: T[], filters: InvoiceFilters): T[] {
    return invoices.filter(inv => {
        // Search query (invoice number, GSTIN, receiver name)
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase()
            const matchesSearch =
                inv.invoiceNumber.toLowerCase().includes(query) ||
                inv.gstin.toLowerCase().includes(query) ||
                (inv.receiverName?.toLowerCase().includes(query) ?? false)
            if (!matchesSearch) return false
        }

        // Date range filter
        if (filters.dateFrom || filters.dateTo) {
            const invDate = parseInvoiceDate(inv.invoiceDate)
            if (invDate) {
                if (filters.dateFrom) {
                    const fromDate = parseInvoiceDate(filters.dateFrom)
                    if (fromDate && invDate < fromDate) return false
                }
                if (filters.dateTo) {
                    const toDate = parseInvoiceDate(filters.dateTo)
                    if (toDate && invDate > toDate) return false
                }
            }
        }

        // Amount range filter
        if (filters.minAmount) {
            const min = parseFloat(filters.minAmount)
            if (!isNaN(min) && inv.totalTaxableValue < min) return false
        }
        if (filters.maxAmount) {
            const max = parseFloat(filters.maxAmount)
            if (!isNaN(max) && inv.totalTaxableValue > max) return false
        }

        // GST rate filter
        if (filters.gstRate && filters.gstRate !== "all") {
            const rate = parseFloat(filters.gstRate)
            const hasRate = inv.items.some(item => item.rate === rate)
            if (!hasRate) return false
        }

        // Place of supply filter
        if (filters.placeOfSupply) {
            if (!inv.placeOfSupply.startsWith(filters.placeOfSupply)) return false
        }

        return true
    })
}
