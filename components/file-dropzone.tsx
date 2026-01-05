
"use client"

import type React from "react"
import { useRef } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileDropzoneProps {
  onFileSelect?: (file: File) => void
}

export function FileDropzone({ onFileSelect }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect?.(e.target.files[0])
      // Reset input value to allow selecting the same file again
      e.target.value = ''
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg transition-all cursor-pointer bg-card hover:bg-secondary/50 group"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
        accept=".xlsx,.xls,.csv,.json"
      />

      <div className="flex flex-col items-center gap-3 text-center p-6">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors">
          <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            Upload GST File
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Excel (.xlsx, .xls) or JSON (GSTR-1 export)
          </p>
        </div>
        <Button variant="outline" className="mt-2 pointer-events-none">
          Browse Files
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Supports: .xlsx, .xls, .csv
        </p>
      </div>
    </div>
  )
}
