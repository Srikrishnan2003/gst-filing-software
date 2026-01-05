import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: "valid" | "error"
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        status === "valid" && "bg-success/10 text-success border border-success/20",
        status === "error" && "bg-destructive/10 text-destructive border border-destructive/20",
      )}
    >
      {status === "valid" ? "Valid" : "Error"}
    </span>
  )
}
