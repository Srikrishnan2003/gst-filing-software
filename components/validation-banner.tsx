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
      className: "border-green-500/50 bg-green-50 dark:bg-green-950/30",
      iconClassName: "text-green-600 dark:text-green-400",
      titleClassName: "text-green-800 dark:text-green-300",
      descClassName: "text-green-700 dark:text-green-400",
    },
    warning: {
      icon: AlertTriangle,
      className: "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30",
      iconClassName: "text-yellow-600 dark:text-yellow-400",
      titleClassName: "text-yellow-800 dark:text-yellow-300",
      descClassName: "text-yellow-700 dark:text-yellow-400",
    },
    error: {
      icon: AlertCircle,
      className: "border-red-500/50 bg-red-50 dark:bg-red-950/30",
      iconClassName: "text-red-600 dark:text-red-400",
      titleClassName: "text-red-800 dark:text-red-300",
      descClassName: "text-red-700 dark:text-red-400",
    },
  }

  const { icon: Icon, className, iconClassName, titleClassName, descClassName } = config[variant]

  return (
    <Alert className={cn("border-2", className)}>
      <Icon className={cn("h-5 w-5", iconClassName)} />
      <AlertTitle className={cn("font-semibold", titleClassName)}>{title}</AlertTitle>
      {description && <AlertDescription className={descClassName}>{description}</AlertDescription>}
    </Alert>
  )
}
