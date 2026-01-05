"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IndianRupee, FileText, TrendingUp } from "lucide-react"

interface TaxSummaryProps {
    data: {
        b2b: {
            count: number
            taxableValue: number
            cgst: number
            sgst: number
            igst: number
            cess: number
            total: number
        }
        hsn: {
            count: number
            taxableValue: number
            cgst: number
            sgst: number
            igst: number
            cess: number
        }[]
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
    }
}

export function TaxSummary({ data }: TaxSummaryProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value)
    }

    return (
        <div className="space-y-6">
            {/* Summary Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Total Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data.totals.invoices}</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Taxable Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.totals.taxableValue)}</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Total Tax</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.totals.totalTax)}</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Grand Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.totals.grandTotal)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* B2B Section Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        B2B Invoices - Outward Supplies (4A, 4B, 6B, 6C)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">No. of Records</TableHead>
                                <TableHead className="text-right">Taxable Value (₹)</TableHead>
                                <TableHead className="text-right">IGST (₹)</TableHead>
                                <TableHead className="text-right">CGST (₹)</TableHead>
                                <TableHead className="text-right">SGST (₹)</TableHead>
                                <TableHead className="text-right">CESS (₹)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">B2B - Tax Invoice</TableCell>
                                <TableCell className="text-right">{data.b2b.count}</TableCell>
                                <TableCell className="text-right">{formatCurrency(data.b2b.taxableValue)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(data.b2b.igst)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(data.b2b.cgst)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(data.b2b.sgst)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(data.b2b.cess)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/30 font-semibold">
                                <TableCell>Total</TableCell>
                                <TableCell className="text-right">{data.b2b.count}</TableCell>
                                <TableCell className="text-right">{formatCurrency(data.b2b.taxableValue)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(data.b2b.igst)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(data.b2b.cgst)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(data.b2b.sgst)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(data.b2b.cess)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Tax Breakdown Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Tax Liability Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Tax Type</TableHead>
                                <TableHead className="text-right">Amount (₹)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>Integrated Tax (IGST)</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(data.totals.igst)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Central Tax (CGST)</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(data.totals.cgst)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>State/UT Tax (SGST)</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(data.totals.sgst)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Cess</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(data.totals.cess)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-primary/10 font-bold">
                                <TableCell>Total Tax Liability</TableCell>
                                <TableCell className="text-right text-primary">{formatCurrency(data.totals.totalTax)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* HSN Summary */}
            {data.hsn.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IndianRupee className="h-5 w-5" />
                            HSN-wise Summary of Outward Supplies
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead>HSN Code</TableHead>
                                    <TableHead className="text-right">Taxable Value (₹)</TableHead>
                                    <TableHead className="text-right">IGST (₹)</TableHead>
                                    <TableHead className="text-right">CGST (₹)</TableHead>
                                    <TableHead className="text-right">SGST (₹)</TableHead>
                                    <TableHead className="text-right">Total Tax (₹)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.hsn.map((hsn, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-mono">{hsn.count}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(hsn.taxableValue)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(hsn.igst)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(hsn.cgst)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(hsn.sgst)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(hsn.cgst + hsn.sgst + hsn.igst)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
