
"use client"

import React, { useRef, useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileDropzoneProps {
  onFilesAdded?: (files: File[]) => void
}

export function FileDropzone({ onFilesAdded }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files).filter(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return ['.xlsx', '.csv', '.json'].includes(ext);
      });

      if (validFiles.length > 0) {
        onFilesAdded?.(validFiles);
      } else {
        alert("Only .xlsx and .csv files are supported.")
      }

      e.target.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return ['.xlsx', '.csv', '.json'].includes(ext);
      });

      if (validFiles.length > 0) {
        onFilesAdded?.(validFiles)
      } else {
        alert("Only .xlsx and .csv files are supported.")
      }
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-all cursor-pointer group relative overflow-hidden",
        isDragging
          ? "border-primary bg-primary/10 scale-[1.02]"
          : "border-border bg-card hover:bg-secondary/50"
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleChange}
        accept=".xlsx,.csv,.json"
      />

      <div className="flex flex-col items-center gap-3 text-center p-6 relative z-10">
        <div className={cn(
          "flex items-center justify-center w-16 h-16 rounded-full transition-colors",
          isDragging ? "bg-primary text-primary-foreground" : "bg-secondary group-hover:bg-primary/10"
        )}>
          <Upload className={cn(
            "w-8 h-8 transition-colors",
            isDragging ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
          )} />
        </div>
        <div>
          <p className="text-base md:text-lg font-semibold text-foreground">
            {isDragging ? "Drop file here" : "Upload GST File"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Excel (.xlsx), CSV or JSON
          </p>
        </div>
        {!isDragging && (
          <Button variant="outline" className="mt-2 pointer-events-none">
            Browse Files
          </Button>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Supports: .xlsx, .csv, .json
        </p>
      </div>
    </div>
  )
}
