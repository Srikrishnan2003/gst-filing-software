"use client"

import { Check, Upload, ClipboardCheck, FileJson } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProcessStepperProps {
  currentStep: number
}

const steps = [
  { id: 1, label: "Upload", icon: Upload },
  { id: 2, label: "Validate", icon: ClipboardCheck },
  { id: 3, label: "Generate", icon: FileJson },
]

export function ProcessStepper({ currentStep }: ProcessStepperProps) {
  return (
    <div className="w-full py-6">
      <div className="relative flex items-center justify-center max-w-md mx-auto">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full mx-8" />

        {/* Progress line */}
        <div
          className="absolute top-5 left-0 h-1 bg-gradient-to-r from-primary to-primary/80 rounded-full mx-8 transition-all duration-500"
          style={{
            width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - 64px)`,
            maxWidth: 'calc(100% - 64px)'
          }}
        />

        {/* Steps */}
        <div className="relative flex items-center justify-between w-full">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id
            const isCurrent = currentStep === step.id
            const Icon = step.icon

            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                    isCompleted && "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg shadow-primary/30",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground border-2 border-muted-foreground/20",
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" strokeWidth={2.5} />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
