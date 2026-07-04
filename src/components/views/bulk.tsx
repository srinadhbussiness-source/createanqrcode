'use client'

import { useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import Papa from 'papaparse'
import JSZip from 'jszip'
import {
  UploadCloud, FileSpreadsheet, ArrowRight, ArrowLeft, Loader2, CheckCircle2,
  XCircle, Lock, Download, RefreshCw, FolderOpen, Settings2, Sparkles,
  AlertTriangle, FileDown, Check, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'
import { QR_TYPES } from '@/lib/qr-types'
import { PLAN_LIMITS, DEFAULT_DESIGN, type QrDesign, type QrTypeId } from '@/lib/types'
import { getQrDataUrl } from '@/lib/qr-generate'
import { QrPreview } from '@/components/qr-preview'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3 | 4 | 5

const STEPS: { num: Step; label: string }[] = [
  { num: 1, label: 'Upload' },
  { num: 2, label: 'Map' },
  { num: 3, label: 'Review' },
  { num: 4, label: 'Generate' },
  { num: 5, label: 'Download' },
]

interface CsvRow { [key: string]: string }

interface BulkResult {
  created: number
  errors: { row: number; error: string }[]
  total: number
}

const DOT_STYLES: { value: QrDesign['dotStyle']; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'dots', label: 'Dots' },
  { value: 'classy', label: 'Classy' },
]
const EYE_STYLES: { value: QrDesign['eyeStyle']; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'extra-rounded', label: 'Rounded' },
  { value: 'dot', label: 'Dot' },
]
const ERROR_LEVELS: QrDesign['errorCorrection'][] = ['L', 'M', 'Q', 'H']

export function BulkView() {
  const navigate = useRouterStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const plan = user?.plan ?? 'free'
  const bulkLimit = PLAN_LIMITS[plan].bulkBatch ?? 0

  const [step, setStep] = useState<Step>(1)
  const [rows, setRows] = useState<CsvRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [qrType, setQrType] = useState<QrTypeId>('url')
  const [payloadKey, setPayloadKey] = useState<string>('')
  const [titleKey, setTitleKey] = useState<string>('')
  const [folderKey, setFolderKey] = useState<string>('')
  const [design, setDesign] = useState<QrDesign>(DEFAULT_DESIGN)
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<BulkResult | null>(null)
  const [zipping, setZipping] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // All hooks must run before the early return below.
  const validRows = useMemo(() => {
    if (!payloadKey || !titleKey) return [] as CsvRow[]
    return rows.filter((r) => (r[titleKey] ?? '').trim() && (r[payloadKey] ?? '').trim())
  }, [rows, payloadKey, titleKey])
  const invalidRows = useMemo(
    () => rows.filter((r) => !(r[titleKey] ?? '').trim() || !(r[payloadKey] ?? '').trim()),
    [rows, payloadKey, titleKey]
  )

  const generateMut = useMutation({
    mutationFn: (payload: {
      rows: CsvRow[]; qrType: QrTypeId; design: QrDesign; logoDataUrl?: string | null
      titleKey: string; payloadKey: string; folderKey?: string | null
    }) => api.post<BulkResult>('/api/bulk', payload),
    onMutate: () => {
      setProgress(2)
    },
    onSuccess: (res) => {
      setResult(res)
      // Animate progress to 100%
      let p = 2
      const interval = setInterval(() => {
        p = Math.min(100, p + Math.max(1, Math.round((100 - p) / 6)))
        setProgress(p)
        if (p >= 100) {
          clearInterval(interval)
          setTimeout(() => setStep(5), 350)
        }
      }, 60)
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : 'Bulk generation failed'
      toast.error(msg)
      setStep(3)
    },
  })

  // ---------- Access gate ----------
  if (bulkLimit === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Bulk Generation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate hundreds of QR codes in seconds from a CSV file.
          </p>
        </div>
        <Card className="relative overflow-hidden border-brand/30">
          <CardContent className="p-0">
            <div className="relative">
              <div className="pointer-events-none select-none p-6 blur-sm" aria-hidden>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="aspect-square rounded-xl border border-border bg-card p-4">
                      <div className="h-full w-full rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
                <div className="max-w-md p-6 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-muted text-brand">
                    <Lock className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-xl font-bold">Bulk generation requires Pro plan or higher</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Upload a CSV with up to {PLAN_LIMITS.pro.bulkBatch} rows (Pro) or {PLAN_LIMITS.business.bulkBatch} rows (Business)
                    and generate branded QR codes in seconds.
                  </p>
                  <Button
                    onClick={() => navigate('billing')}
                    className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90"
                  >
                    Upgrade to Pro <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------- Helpers ----------
  const handleFile = (file: File) => {
    setParseError(null)
    setFileName(file.name)
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (!res.data?.length) {
          setParseError('No rows found in this file.')
          return
        }
        const cols = (res.meta.fields ?? Object.keys(res.data[0] ?? {})).filter(Boolean)
        if (cols.length === 0) {
          setParseError('Could not detect column headers.')
          return
        }
        setRows(res.data)
        setHeaders(cols)
        // Auto-suggest mapping
        const guess = (kw: string[]) => cols.find((c) => kw.some((k) => c.toLowerCase().includes(k)))
        setPayloadKey(guess(['url', 'link', 'payload', 'website', 'destination']) ?? cols[0])
        setTitleKey(guess(['title', 'name', 'label']) ?? cols[1] ?? cols[0])
        setFolderKey(guess(['folder']) ?? '')
        setStep(2)
        toast.success(`Loaded ${res.data.length} rows`)
      },
      error: (err) => setParseError(err.message || 'Failed to parse CSV'),
    })
  }

  // startGenerate triggers the generateMut defined above.
  const startGenerate = () => {
    setStep(4)
    setProgress(0)
    // Send the folder *column name* (not the first row's value) so the
    // backend can read a per-row folder ID for each code. Was: only the
    // first row's folder was applied to every code in the batch.
    generateMut.mutate({
      rows: validRows,
      qrType,
      design,
      logoDataUrl,
      titleKey,
      payloadKey,
      folderKey: folderKey || null,
    })
  }

  const downloadSampleCsv = (kind: 'url' | 'wifi' | 'upi') => {
    let csv = ''
    if (kind === 'url') {
      csv = 'title,url\nHomepage,https://example.com\nBlog,https://example.com/blog\nPricing,https://example.com/pricing'
    } else if (kind === 'wifi') {
      csv = 'title,wifi_payload\nOffice,WIFI:T:WPA2;S:OfficeNet;P:Pass123;;\nCafe,WIFI:T:WPA2;S:CafeFree;P:welcome;;\nGuest,WIFI:T:WPA2;S:GuestNet;P:guest2024;;'
    } else {
      csv = 'title,upi_payload\nStore A,upi://pay?pa=storea@upi&pn=Store%20A\nStore B,upi://pay?pa=storeb@upi&pn=Store%20B\nStore C,upi://pay?pa=storec@upi&pn=Store%20C'
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sample-${kind}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadErrorReport = () => {
    if (!result?.errors?.length) {
      toast.info('No errors to report')
      return
    }
    const csv = ['row,error', ...result.errors.map((e) => `${e.row},"${e.error.replace(/"/g, '""')}"`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk-errors.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadZip = async () => {
    if (!validRows.length) return
    setZipping(true)
    try {
      const zip = new JSZip()
      // Cap at 500 in-browser to avoid heavy memory; the rest remain in the dashboard.
      const slice = validRows.slice(0, 500)
      let done = 0
      for (const row of slice) {
        const title = row[titleKey].trim()
        const payload = row[payloadKey].trim()
        const safeName = title.replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 40).trim() || `qr-${done + 1}`
        try {
          const dataUrl = await getQrDataUrl(payload, design, logoDataUrl, 512)
          const base64 = dataUrl.split(',')[1]
          if (base64) zip.file(`${safeName}.png`, base64, { base64: true })
        } catch {
          // skip failed render
        }
        done++
        setProgress(Math.round((done / slice.length) * 100))
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-codes-bulk-${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Downloaded ${slice.length} QR codes as ZIP`)
    } catch {
      toast.error('ZIP generation failed')
    } finally {
      setZipping(false)
      setProgress(0)
    }
  }

  const resetWizard = () => {
    setStep(1)
    setRows([])
    setHeaders([])
    setFileName('')
    setParseError(null)
    setResult(null)
    setProgress(0)
  }

  // ---------- Render ----------
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Bulk Generation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a CSV, map columns, customize design, generate a batch.
          </p>
        </div>
        <Badge variant="outline" className="gap-1 border-brand/40 text-brand">
          <Sparkles className="h-3 w-3" /> Limit: {bulkLimit} / batch
        </Badge>
      </div>

      {/* Step indicator */}
      <Card className="border-border">
        <CardContent className="p-4">
          <ol className="flex flex-wrap items-center gap-2">
            {STEPS.map((s, i) => {
              const isActive = s.num === step
              const isDone = s.num < step
              return (
                <li key={s.num} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium sm:text-sm',
                      isActive ? 'bg-brand text-brand-foreground' :
                      isDone ? 'bg-brand-muted text-brand' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-5 w-5 place-items-center rounded-full text-[10px]',
                        isActive ? 'bg-brand-foreground/20' : isDone ? 'bg-brand/20' : 'bg-background/40'
                      )}
                    >
                      {isDone ? <Check className="h-3 w-3" /> : s.num}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) handleFile(f)
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 text-center transition-colors',
                  dragOver ? 'border-brand bg-brand-muted/50' : 'border-border bg-card/50'
                )}
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-muted text-brand">
                  <UploadCloud className="h-7 w-7" />
                </span>
                <div>
                  <p className="font-semibold">Drop your CSV here</p>
                  <p className="text-sm text-muted-foreground">or click to browse — .csv files supported</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Choose file
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </div>
              {parseError && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" /> {parseError}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Don&apos;t have a CSV? Use a sample.</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadSampleCsv('url')}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> URL sample
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadSampleCsv('wifi')}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> WiFi sample
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadSampleCsv('upi')}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> UPI sample
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Map */}
      {step === 2 && (
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Map columns</CardTitle>
              <p className="text-xs text-muted-foreground">
                Loaded <strong>{rows.length}</strong> rows from <strong className="break-all">{fileName}</strong>.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>QR Type</Label>
                <Select value={qrType} onValueChange={(v) => setQrType(v as QrTypeId)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QR_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Payload column <span className="text-destructive">*</span></Label>
                  <Select value={payloadKey} onValueChange={setPayloadKey}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title column</Label>
                  <Select value={titleKey} onValueChange={setTitleKey}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Folder column (optional)</Label>
                  <Select value={folderKey || '__none__'} onValueChange={(v) => setFolderKey(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No folder column</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview mapped */}
              <div>
                <Label>Preview (first 3 rows mapped)</Label>
                <div className="mt-2 overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Payload</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.slice(0, 3).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="max-w-[160px] truncate font-medium">
                            {titleKey ? (r[titleKey] || <span className="text-destructive">—</span>) : '—'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {payloadKey ? (r[payloadKey] || <span className="text-destructive">—</span>) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!payloadKey || !titleKey}
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  Continue to Review <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Review & customize</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <ReviewStat label="Total rows" value={String(rows.length)} />
                  <ReviewStat label="Valid rows" value={String(validRows.length)} accent />
                  <ReviewStat label="Invalid" value={String(invalidRows.length)} destructive={invalidRows.length > 0} />
                </div>
                {invalidRows.length > 0 && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    <div className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5" /> {invalidRows.length} rows have missing title or payload
                    </div>
                    <p className="mt-1 text-destructive/80">
                      These rows will be skipped during generation. You can still proceed with the valid rows.
                    </p>
                  </div>
                )}

                {/* Compact design customizer */}
                <DesignCustomizer design={design} setDesign={setDesign} logoDataUrl={logoDataUrl} setLogoDataUrl={setLogoDataUrl} />

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Go back
                  </Button>
                  <Button
                    onClick={startGenerate}
                    disabled={validRows.length === 0 || validRows.length > bulkLimit}
                    className="bg-brand text-brand-foreground hover:bg-brand/90"
                  >
                    {invalidRows.length > 0 ? 'Skip invalid and continue' : `Generate ${validRows.length} QR codes`}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
                {validRows.length > bulkLimit && (
                  <p className="text-xs text-destructive">
                    Your batch exceeds the {bulkLimit} row limit. Please upgrade or split your CSV.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live preview of first row */}
          <Card className="border-border h-fit">
            <CardHeader>
              <CardTitle className="text-base">Preview (row 1)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              {validRows[0] ? (
                <>
                  <div className="rounded-xl bg-card p-3 ring-1 ring-border">
                    <QrPreview
                      payload={validRows[0][payloadKey] || ' '}
                      design={design}
                      logoDataUrl={logoDataUrl}
                      size={180}
                    />
                  </div>
                  <div className="w-full text-center">
                    <p className="truncate text-sm font-medium">{validRows[0][titleKey]}</p>
                    <p className="truncate text-xs text-muted-foreground">{validRows[0][payloadKey]}</p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No valid rows to preview.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Generate */}
      {step === 4 && (
        <Card className="border-border">
          <CardContent className="p-8">
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-muted text-brand">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Generating {validRows.length} QR codes...</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Please wait — do not close this tab.
                </p>
              </div>
              <div className="w-full">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {progress < 100 ? 'Working...' : 'Done!'}
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Estimated time: ~{Math.max(1, Math.round(validRows.length / 50))}s ·
                  {' '}{Math.round((progress / 100) * validRows.length)} / {validRows.length} processed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Download */}
      {step === 5 && result && (
        <div className="space-y-4">
          <Card className="border-brand/30">
            <CardContent className="p-6 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-muted text-brand">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="mt-3 text-xl font-bold">
                {result.created} QR codes generated
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your batch is ready. Download as ZIP, view them in your dashboard, or generate another batch.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Download</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={downloadZip}
                  disabled={zipping}
                  className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {zipping ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Zipping... {progress}%</>
                  ) : (
                    <><Download className="mr-2 h-4 w-4" /> Download ZIP (PNG, max 500)</>
                  )}
                </Button>
                <Button
                  onClick={downloadErrorReport}
                  variant="outline"
                  className="w-full"
                  disabled={result.errors.length === 0}
                >
                  <FileDown className="mr-2 h-4 w-4" /> Download Error Report
                  {result.errors.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{result.errors.length}</Badge>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  ZIP download limited to first 500 codes for performance. All codes are saved in your dashboard.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Next steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('qr-codes')}
                >
                  <FolderOpen className="mr-2 h-4 w-4" /> View all QR codes in dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={resetWizard}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Generate another batch
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Error log */}
          {result.errors.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Errors ({result.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto scroll-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{e.row}</TableCell>
                          <TableCell className="text-destructive">{e.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Sub components ----------

function ReviewStat({
  label, value, accent, destructive,
}: { label: string; value: string; accent?: boolean; destructive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        destructive ? 'border-destructive/30 bg-destructive/5' :
        accent ? 'border-brand/30 bg-brand-muted' : 'border-border bg-card'
      )}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-lg font-bold', destructive && 'text-destructive', accent && 'text-brand')}>
        {value}
      </p>
    </div>
  )
}

function DesignCustomizer({
  design, setDesign, logoDataUrl, setLogoDataUrl,
}: {
  design: QrDesign
  setDesign: (d: QrDesign) => void
  logoDataUrl: string | null
  setLogoDataUrl: (s: string | null) => void
}) {
  const logoRef = useRef<HTMLInputElement>(null)

  const update = <K extends keyof QrDesign>(k: K, v: QrDesign[K]) =>
    setDesign({ ...design, [k]: v })

  const onLogo = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogoDataUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-brand" />
        <p className="text-sm font-semibold">Design (applied to all QR codes in batch)</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Foreground</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={design.fgColor}
              onChange={(e) => update('fgColor', e.target.value)}
              className="h-8 w-9 cursor-pointer rounded border border-border bg-transparent"
            />
            <Input
              value={design.fgColor}
              onChange={(e) => update('fgColor', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Background</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={design.bgColor}
              onChange={(e) => update('bgColor', e.target.value)}
              className="h-8 w-9 cursor-pointer rounded border border-border bg-transparent"
            />
            <Input
              value={design.bgColor}
              onChange={(e) => update('bgColor', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Dot style</Label>
          <Select value={design.dotStyle} onValueChange={(v) => update('dotStyle', v as QrDesign['dotStyle'])}>
            <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOT_STYLES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Eye style</Label>
          <Select value={design.eyeStyle} onValueChange={(v) => update('eyeStyle', v as QrDesign['eyeStyle'])}>
            <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EYE_STYLES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Error correction</Label>
          <Select value={design.errorCorrection} onValueChange={(v) => update('errorCorrection', v as QrDesign['errorCorrection'])}>
            <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ERROR_LEVELS.map((l) => <SelectItem key={l} value={l}>Level {l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Logo</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => logoRef.current?.click()}
            >
              <UploadCloud className="mr-1 h-3 w-3" /> Upload
            </Button>
            {logoDataUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setLogoDataUrl(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onLogo(e.target.files?.[0])}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkView
