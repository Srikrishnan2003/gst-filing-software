import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "./status-badge"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getHSNDescription } from "@/lib/data/hsn-master"

interface InvoiceRow {
  id: string
  invoiceNo: string
  date: string
  party: string
  gstin: string
  amount: number
  taxAmount: number
  status: "valid" | "error" | "duplicate"
  hsnCode?: string
  hsnDescription?: string
}

interface InvoiceTableProps {
  data: InvoiceRow[]
}

export function InvoiceTable({ data }: InvoiceTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
        No invoices found in this category
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Invoice No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Party Name</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>HSN Code</TableHead>
              <TableHead className="text-right">Taxable Value</TableHead>
              <TableHead className="text-right">Tax Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  row.status === "error" && "bg-destructive/5 hover:bg-destructive/10",
                  row.status === "duplicate" && "bg-orange-500/10 hover:bg-orange-500/20 dark:bg-orange-500/5"
                )}
              >
                <TableCell className="font-medium">{row.invoiceNo}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={row.party}>
                  {row.party}
                </TableCell>
                <TableCell>{row.gstin}</TableCell>
                <TableCell>
                  {row.hsnCode ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted underline-offset-2 text-primary">
                          {row.hsnCode}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px] text-wrap">
                        <p className="font-medium">{row.hsnCode}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getHSNDescription(row.hsnCode)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">₹{row.amount.toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-right">₹{row.taxAmount.toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-center">
                  {row.status === "valid" ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Valid
                    </span>
                  ) : row.status === "duplicate" ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      Duplicate
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Error
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}

