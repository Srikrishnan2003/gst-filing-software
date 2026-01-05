import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "./status-badge"

interface Invoice {
  id: string
  invoiceNo: string
  date: string
  party: string
  gstin: string
  amount: number
  taxAmount: number
  status: "valid" | "error"
}

interface InvoiceTableProps {
  data: Invoice[]
}

export function InvoiceTable({ data }: InvoiceTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Invoice No</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Party Name</TableHead>
            <TableHead className="font-semibold">GSTIN</TableHead>
            <TableHead className="font-semibold text-right">Amount</TableHead>
            <TableHead className="font-semibold text-right">Tax Amount</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <p className="text-muted-foreground">No invoices found</p>
              </TableCell>
            </TableRow>
          ) : (
            data.map((invoice) => (
              <TableRow key={invoice.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                <TableCell className="text-muted-foreground">{invoice.date}</TableCell>
                <TableCell>{invoice.party}</TableCell>
                <TableCell className="font-mono text-sm">{invoice.gstin}</TableCell>
                <TableCell className="text-right font-medium">₹{invoice.amount.toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-right font-medium">₹{invoice.taxAmount.toLocaleString("en-IN")}</TableCell>
                <TableCell>
                  <StatusBadge status={invoice.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
