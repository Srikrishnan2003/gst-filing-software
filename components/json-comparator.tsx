"use client"

import { useState, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ArrowRight,
    Copy,
    Trash2,
    FileJson,
    Equal,
    Diff,
    Upload,
    File
} from "lucide-react"

interface DiffResult {
    path: string
    type: 'match' | 'mismatch' | 'missing_in_app' | 'missing_in_portal' | 'type_mismatch'
    portalValue?: unknown
    appValue?: unknown
}

interface ComparisonSummary {
    totalFields: number
    matches: number
    mismatches: number
    missingInApp: number
    missingInPortal: number
}

// Portal-specific fields that are added after upload/filing (not part of user input)
const PORTAL_SPECIFIC_PATTERNS = [
    /\.flag$/,           // Update flag
    /\.updby$/,          // Updated by
    /\.cflag$/,          // Change flag
    /\.chksum$/,         // Checksum
    /^fil_dt$/,          // Filing date
    /^b2ba/,             // Amendments section (and all nested)
    /^hsn\.hsn_b2c$/,    // B2C HSN (if no B2C sales)
    /^hsn\.chksum$/,     // HSN checksum
    /^doc_issue\.chksum$/, // Doc issue checksum
    /\.itms\[num=\d+\]$/,  // Entire item entry mismatch due to num difference
    /\.num$/,            // Item/HSN numbering (portal assigns different numbers)
];

// Check if a field path is portal-specific
function isPortalSpecificField(path: string): boolean {
    return PORTAL_SPECIFIC_PATTERNS.some(pattern => pattern.test(path));
}

// Business key mappings for smart array comparison
const ARRAY_KEY_MAPPINGS: Record<string, string> = {
    'b2b': 'ctin',           // Match B2B entries by customer GSTIN
    'inv': 'inum',           // Match invoices by invoice number
    'nt': 'nt_num',          // Match notes by note number
    // 'itms' removed - use index-based since portal assigns different num values
    'hsn_b2b': 'hsn_sc',     // Match HSN entries by HSN code
    'hsn_b2c': 'hsn_sc',     // Match HSN entries by HSN code
    'cdnr': 'ctin',          // Match CDNR by customer GSTIN
    'doc_det': 'doc_num',    // Match doc details by doc number
    'docs': 'num',           // Match docs by number
};

// Get the business key for an array based on the path
function getArrayKey(path: string): string | null {
    const parts = path.split('.');
    const lastPart = parts[parts.length - 1].replace(/\[\d+\]$/, '');
    return ARRAY_KEY_MAPPINGS[lastPart] || null;
}

// Deep comparison function with smart key matching
function deepCompare(
    portal: unknown,
    app: unknown,
    path: string = '',
    results: DiffResult[] = []
): DiffResult[] {
    // Both null/undefined
    if (portal === null && app === null) {
        results.push({ path: path || 'root', type: 'match', portalValue: null, appValue: null })
        return results
    }

    if (portal === undefined && app === undefined) {
        return results
    }

    // Type mismatch
    if (typeof portal !== typeof app) {
        results.push({
            path: path || 'root',
            type: 'type_mismatch',
            portalValue: portal,
            appValue: app
        })
        return results
    }

    // Arrays - Smart matching by business key
    if (Array.isArray(portal) && Array.isArray(app)) {
        const keyField = getArrayKey(path)

        if (keyField && portal.length > 0 && typeof portal[0] === 'object') {
            // Smart matching: Match array items by business key
            const portalMap = new Map<string, { item: unknown; index: number }>()
            const appMap = new Map<string, { item: unknown; index: number }>()

            portal.forEach((item, idx) => {
                if (item && typeof item === 'object') {
                    const key = String((item as Record<string, unknown>)[keyField] || idx)
                    portalMap.set(key, { item, index: idx })
                }
            })

            app.forEach((item, idx) => {
                if (item && typeof item === 'object') {
                    const key = String((item as Record<string, unknown>)[keyField] || idx)
                    appMap.set(key, { item, index: idx })
                }
            })

            // Find all unique keys
            const allKeys = new Set([...portalMap.keys(), ...appMap.keys()])

            for (const key of allKeys) {
                const portalEntry = portalMap.get(key)
                const appEntry = appMap.get(key)
                const itemPath = `${path}[${keyField}=${key}]`

                if (!portalEntry) {
                    results.push({ path: itemPath, type: 'missing_in_portal', appValue: appEntry?.item })
                } else if (!appEntry) {
                    results.push({ path: itemPath, type: 'missing_in_app', portalValue: portalEntry.item })
                } else {
                    deepCompare(portalEntry.item, appEntry.item, itemPath, results)
                }
            }
        } else {
            // Fallback: Index-based comparison for simple arrays
            const maxLen = Math.max(portal.length, app.length)
            for (let i = 0; i < maxLen; i++) {
                const itemPath = `${path}[${i}]`
                if (i >= portal.length) {
                    results.push({ path: itemPath, type: 'missing_in_portal', appValue: app[i] })
                } else if (i >= app.length) {
                    results.push({ path: itemPath, type: 'missing_in_app', portalValue: portal[i] })
                } else {
                    deepCompare(portal[i], app[i], itemPath, results)
                }
            }
        }
        return results
    }

    // Objects
    if (typeof portal === 'object' && portal !== null && typeof app === 'object' && app !== null) {
        const allKeys = new Set([...Object.keys(portal as object), ...Object.keys(app as object)])
        for (const key of allKeys) {
            const keyPath = path ? `${path}.${key}` : key
            const portalObj = portal as Record<string, unknown>
            const appObj = app as Record<string, unknown>

            if (!(key in portalObj)) {
                results.push({ path: keyPath, type: 'missing_in_portal', appValue: appObj[key] })
            } else if (!(key in appObj)) {
                results.push({ path: keyPath, type: 'missing_in_app', portalValue: portalObj[key] })
            } else {
                deepCompare(portalObj[key], appObj[key], keyPath, results)
            }
        }
        return results
    }

    // Primitives
    if (portal === app) {
        results.push({ path: path || 'root', type: 'match', portalValue: portal, appValue: app })
    } else {
        // Check for numeric equivalence (e.g., "100" vs 100)
        if (!isNaN(Number(portal)) && !isNaN(Number(app)) && Number(portal) === Number(app)) {
            results.push({ path: path || 'root', type: 'match', portalValue: portal, appValue: app })
        } else {
            results.push({ path: path || 'root', type: 'mismatch', portalValue: portal, appValue: app })
        }
    }

    return results
}

// Format value for display
function formatValue(value: unknown): string {
    if (value === undefined) return 'undefined'
    if (value === null) return 'null'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
}

interface FileUploadBoxProps {
    title: string
    description: string
    iconColor: string
    file: File | null
    error?: string
    onFileSelect: (file: File) => void
    onClear: () => void
}

function FileUploadBox({ title, description, iconColor, file, error, onFileSelect, onClear }: FileUploadBoxProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && droppedFile.name.endsWith('.json')) {
            onFileSelect(droppedFile)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            onFileSelect(selectedFile)
        }
    }

    return (
        <Card className={isDragging ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileJson className={`h-5 w-5 ${iconColor}`} />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                />

                {file ? (
                    <div className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <File className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onClear}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        {error && (
                            <p className="text-red-500 text-sm mt-3 flex items-center gap-1">
                                <XCircle className="h-4 w-4" />
                                {error}
                            </p>
                        )}
                    </div>
                ) : (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                            transition-colors hover:border-primary hover:bg-muted/30
                            ${isDragging ? 'border-primary bg-muted/30' : 'border-muted-foreground/30'}
                        `}
                    >
                        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm font-medium">Drop JSON file here</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            or click to browse
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export function JsonComparator() {
    const [portalFile, setPortalFile] = useState<File | null>(null)
    const [appFile, setAppFile] = useState<File | null>(null)
    const [portalJson, setPortalJson] = useState<unknown>(null)
    const [appJson, setAppJson] = useState<unknown>(null)
    const [parseError, setParseError] = useState<{ portal?: string; app?: string }>({})

    // Read and parse JSON file
    const handleFileSelect = async (file: File, type: 'portal' | 'app') => {
        try {
            const text = await file.text()
            const parsed = JSON.parse(text)

            if (type === 'portal') {
                setPortalFile(file)
                setPortalJson(parsed)
                setParseError(prev => ({ ...prev, portal: undefined }))
            } else {
                setAppFile(file)
                setAppJson(parsed)
                setParseError(prev => ({ ...prev, app: undefined }))
            }
        } catch {
            if (type === 'portal') {
                setPortalFile(file)
                setPortalJson(null)
                setParseError(prev => ({ ...prev, portal: 'Invalid JSON format' }))
            } else {
                setAppFile(file)
                setAppJson(null)
                setParseError(prev => ({ ...prev, app: 'Invalid JSON format' }))
            }
        }
    }

    // Compare JSONs
    const comparison = useMemo(() => {
        if (!portalJson || !appJson) return null

        const allResults = deepCompare(portalJson, appJson)

        // Separate portal-specific fields from real differences
        const portalSpecificDiffs = allResults.filter(r =>
            r.type !== 'match' && isPortalSpecificField(r.path)
        )
        const realDiffs = allResults.filter(r =>
            r.type !== 'match' && !isPortalSpecificField(r.path)
        )
        const matches = allResults.filter(r => r.type === 'match')

        const summary: ComparisonSummary = {
            totalFields: allResults.length,
            matches: matches.length,
            // Only count non-portal-specific differences
            mismatches: realDiffs.filter(r => r.type === 'mismatch' || r.type === 'type_mismatch').length,
            missingInApp: realDiffs.filter(r => r.type === 'missing_in_app').length,
            missingInPortal: realDiffs.filter(r => r.type === 'missing_in_portal').length,
        }

        return {
            results: allResults,
            realDiffs,
            portalSpecificDiffs,
            matches,
            summary
        }
    }, [portalJson, appJson])

    const handleClear = () => {
        setPortalFile(null)
        setAppFile(null)
        setPortalJson(null)
        setAppJson(null)
        setParseError({})
    }

    const handleCopyDiff = () => {
        if (!comparison) return
        const diffText = comparison.realDiffs
            .map(r => `${r.path}: ${r.type}\n  Portal: ${formatValue(r.portalValue)}\n  App: ${formatValue(r.appValue)}`)
            .join('\n\n')
        navigator.clipboard.writeText(diffText)
    }

    const isMatch = comparison && comparison.summary.mismatches === 0 &&
        comparison.summary.missingInApp === 0 &&
        comparison.summary.missingInPortal === 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Diff className="h-6 w-6" />
                        JSON Comparison Tool
                    </h2>
                    <p className="text-muted-foreground">
                        Upload GST Portal JSON and App-generated JSON to compare
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClear} className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Clear All
                    </Button>
                    {comparison && (
                        <Button variant="outline" onClick={handleCopyDiff} className="gap-2">
                            <Copy className="h-4 w-4" />
                            Copy Differences
                        </Button>
                    )}
                </div>
            </div>

            {/* File Upload Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadBox
                    title="GST Portal JSON"
                    description="Upload the JSON from GST Portal"
                    iconColor="text-blue-500"
                    file={portalFile}
                    error={parseError.portal}
                    onFileSelect={(file) => handleFileSelect(file, 'portal')}
                    onClear={() => {
                        setPortalFile(null)
                        setPortalJson(null)
                        setParseError(prev => ({ ...prev, portal: undefined }))
                    }}
                />

                <FileUploadBox
                    title="App-Generated JSON"
                    description="Upload the JSON generated by this app"
                    iconColor="text-green-500"
                    file={appFile}
                    error={parseError.app}
                    onFileSelect={(file) => handleFileSelect(file, 'app')}
                    onClear={() => {
                        setAppFile(null)
                        setAppJson(null)
                        setParseError(prev => ({ ...prev, app: undefined }))
                    }}
                />
            </div>

            {/* Comparison Results */}
            {comparison && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                {isMatch ? (
                                    <>
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        <span className="text-green-600">Perfect Match!</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                                        <span className="text-amber-600">Differences Found</span>
                                    </>
                                )}
                            </span>

                            {/* Summary Stats */}
                            <div className="flex gap-4 text-sm font-normal">
                                <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {comparison.summary.matches} matches
                                </span>
                                {comparison.summary.mismatches > 0 && (
                                    <span className="flex items-center gap-1 text-red-600">
                                        <XCircle className="h-4 w-4" />
                                        {comparison.summary.mismatches} mismatches
                                    </span>
                                )}
                                {comparison.summary.missingInApp > 0 && (
                                    <span className="flex items-center gap-1 text-amber-600">
                                        <AlertTriangle className="h-4 w-4" />
                                        {comparison.summary.missingInApp} missing in app
                                    </span>
                                )}
                                {comparison.summary.missingInPortal > 0 && (
                                    <span className="flex items-center gap-1 text-blue-600">
                                        <AlertTriangle className="h-4 w-4" />
                                        {comparison.summary.missingInPortal} extra in app
                                    </span>
                                )}
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Real Differences Table */}
                        {comparison.realDiffs.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium">Field Path</th>
                                            <th className="px-4 py-2 text-left font-medium">Status</th>
                                            <th className="px-4 py-2 text-left font-medium">Portal Value</th>
                                            <th className="px-4 py-2 text-center font-medium w-10"></th>
                                            <th className="px-4 py-2 text-left font-medium">App Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {comparison.realDiffs.map((result, idx) => (
                                            <tr key={idx} className={`
                                                    ${result.type === 'mismatch' || result.type === 'type_mismatch' ? 'bg-red-50 dark:bg-red-950/30' : ''}
                                                    ${result.type === 'missing_in_app' ? 'bg-amber-50 dark:bg-amber-950/30' : ''}
                                                    ${result.type === 'missing_in_portal' ? 'bg-blue-50 dark:bg-blue-950/30' : ''}
                                                `}>
                                                <td className="px-4 py-2 font-mono text-xs">{result.path}</td>
                                                <td className="px-4 py-2">
                                                    {result.type === 'mismatch' && (
                                                        <span className="text-red-600 flex items-center gap-1">
                                                            <XCircle className="h-3 w-3" /> Value Mismatch
                                                        </span>
                                                    )}
                                                    {result.type === 'type_mismatch' && (
                                                        <span className="text-red-600 flex items-center gap-1">
                                                            <XCircle className="h-3 w-3" /> Type Mismatch
                                                        </span>
                                                    )}
                                                    {result.type === 'missing_in_app' && (
                                                        <span className="text-amber-600 flex items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" /> Missing in App
                                                        </span>
                                                    )}
                                                    {result.type === 'missing_in_portal' && (
                                                        <span className="text-blue-600 flex items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" /> Extra in App
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 font-mono text-xs max-w-[200px] truncate" title={formatValue(result.portalValue)}>
                                                    {result.portalValue !== undefined ? formatValue(result.portalValue) : <span className="text-muted-foreground italic">—</span>}
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                </td>
                                                <td className="px-4 py-2 font-mono text-xs max-w-[200px] truncate" title={formatValue(result.appValue)}>
                                                    {result.appValue !== undefined ? formatValue(result.appValue) : <span className="text-muted-foreground italic">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-green-600">
                                <CheckCircle2 className="h-12 w-12 mx-auto mb-3" />
                                <p className="text-lg font-medium">All {comparison.summary.matches} fields match perfectly!</p>
                                <p className="text-muted-foreground">Your JSON generation is working correctly.</p>
                            </div>
                        )}

                        {/* Portal-Specific Fields (Non-impactful warnings) */}
                        {comparison.portalSpecificDiffs.length > 0 && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1">
                                    <AlertTriangle className="h-4 w-4 inline" />
                                    {comparison.portalSpecificDiffs.length} portal-specific fields (non-impactful)
                                </summary>
                                <div className="mt-2 border border-amber-200 dark:border-amber-900 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 p-3">
                                    <p className="text-xs text-muted-foreground mb-2">
                                        These fields are added by the GST portal after upload/filing and are not required in your JSON.
                                    </p>
                                    <div className="max-h-[200px] overflow-auto text-xs font-mono space-y-1">
                                        {comparison.portalSpecificDiffs.map((r, idx) => (
                                            <div key={idx} className="py-1 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                                <span>{r.path}</span>
                                                <span className="text-muted-foreground">
                                                    ({r.type === 'missing_in_app' ? 'portal-only' : r.type})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </details>
                        )}

                        {/* Matching Fields (Collapsible) */}
                        {comparison.matches.length > 0 && comparison.realDiffs.length > 0 && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                    <Equal className="h-4 w-4 inline mr-1" />
                                    Show {comparison.matches.length} matching fields
                                </summary>
                                <div className="mt-2 max-h-[300px] overflow-auto border rounded p-2 text-xs font-mono bg-muted/30">
                                    {comparison.matches.map((r, idx) => (
                                        <div key={idx} className="py-1 flex items-center gap-2">
                                            <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                            <span className="text-muted-foreground">{r.path}:</span>
                                            <span className="truncate">{formatValue(r.portalValue)}</span>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Instructions */}
            {!comparison && !portalFile && !appFile && (
                <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                        <FileJson className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">How to use</h3>
                        <ol className="text-sm text-muted-foreground space-y-2 max-w-md mx-auto text-left list-decimal list-inside">
                            <li>Upload your Excel file and generate JSON using this app</li>
                            <li>Download a sample GSTR-1 JSON from the GST portal</li>
                            <li>Drop or select both JSON files above</li>
                            <li>View the comparison results to verify your JSON structure</li>
                        </ol>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
