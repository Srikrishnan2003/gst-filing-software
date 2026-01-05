import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface ValidationBannerProps {
  variant: "success" | "warning" | "error"
  title: string
  description?: string
}

export function ValidationBanner({ variant, title, description }: ValidationBannerProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      className: "border-success/50 bg-success/5 text-success-foreground",
      iconClassName: "text-success",
    },
    warning: {
      icon: AlertTriangle,
      className: "border-warning/50 bg-warning/5 text-warning-foreground",
      iconClassName: "text-warning",
    },
    error: {
      icon: AlertCircle,
      className: "border-destructive/50 bg-destructive/5 text-destructive-foreground",
      iconClassName: "text-destructive",
    },
  }

  const { icon: Icon, className, iconClassName } = config[variant]

  return (
    <Alert className={cn("border-2", className)}>
      <Icon className={cn("h-5 w-5", iconClassName)} />
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
    </Alert>
  )
}
