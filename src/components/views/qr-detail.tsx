'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft, Star, Download, Copy, ExternalLink, Pencil, Check, X, Loader2,
  QrCode as QrCodeIcon, Lock, Eye, Calendar, Hash, Tag, Folder as FolderIcon,
  Play, Pause, Sparkles, TrendingUp, Globe, ShieldCheck, Clock, BarChart3,
  Users, Smartphone, Monitor, Download as DownloadIcon, Zap, Share2,
  History, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QrPreview } from '@/components/qr-preview'
import { ScanPreview } from '@/components/scan-preview'
import { ShareDialog } from '@/components/share-dialog'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'
import { QR_TYPE_MAP } from '@/lib/qr-types'
import type { QrCodeRecord, FolderRecord, ScanRecord, RedirectRule, QrDesign } from '@/lib/types'
import { PLAN_LIMITS, type Plan } from '@/lib/types'
import { formatDate, formatDateTime, formatNumber } from '@/lib/format'
import { downloadQrPng, downloadQrSvg, downloadQrPdf, downloadQrEps } from '@/lib/qr-generate'
import { cn } from '@/lib/utils'
import {
  type AnalyticsSummary, type RangeKey,
  RANGE_OPTIONS, DEVICE_COLOR, UNIQUE_COLOR,
  StatCard, DonutCard, Heatmap, EmptyChart,
  ScansOverTimeChart, TopCountriesChart, TopReferrersList, RecentScansFeed,
} from '@/components/analytics-blocks'

/**
 * Snapshot of a QR code's editable state at a point in time.
 * Mirrors the response of `GET /api/qr-codes/[id]/revisions`.
 */
interface RevisionRecord {
  id: string
  qrCodeId: string
  title: string
  staticPayload: string | null
  destinationUrl: string | null
  design: QrDesign
  logoDataUrl: string | null
  redirectRules: RedirectRule[] | null
  expiresAt: string | null
  maxScans: number | null
  status: string
  editedBy: string
  editedAt: string
}

export function QrDetailView() {
  const navigate = useRouterStore((s) => s.navigate)
  const params = useRouterStore((s) => s.params)
  const id = params.id
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const plan = (user?.plan ?? 'free') as Plan
  const limits = PLAN_LIMITS[plan]

  const { data: code, isLoading } = useQuery({
    queryKey: ['qr-codes', id],
    queryFn: () => api.get<QrCodeRecord>(`/api/qr-codes/${id}`),
    enabled: !!id,
  })
  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.get<{ data: FolderRecord[] }>('/api/folders'),
  })

  // Per-QR analytics — deep breakdown for dynamic codes (plan-gated).
  const [range, setRange] = useState<RangeKey>(
    limits.analyticsDays && limits.analyticsDays >= 30 ? '30' : '7'
  )
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['qr-codes', id, 'analytics', range],
    queryFn: () => api.get<AnalyticsSummary>(`/api/qr-codes/${id}/analytics?range=${range}`),
    enabled: !!id && !!code?.isDynamic && plan !== 'free',
    refetchInterval: 15000, // real-ish-time: refresh every 15s
  })

  // Revision history — list of past edit snapshots. Enabled once we have the
  // QR code loaded (the endpoint is ownership-checked on the server).
  const { data: revisionsData, isLoading: revisionsLoading } = useQuery({
    queryKey: ['qr-codes', id, 'revisions'],
    queryFn: () => api.get<{ data: RevisionRecord[] }>(`/api/qr-codes/${id}/revisions`),
    enabled: !!id && !!code,
  })

  // Restore a previous revision. The server logs the current state as a new
  // revision before reverting (so the restore itself is undoable), then
  // applies the snapshot to the QR code.
  const restoreMut = useMutation({
    mutationFn: (revisionId: string) =>
      api.post<QrCodeRecord>(`/api/qr-codes/${id}/revisions`, { revisionId }),
    onSuccess: (_data, revisionId) => {
      qc.invalidateQueries({ queryKey: ['qr-codes', id] })
      qc.invalidateQueries({ queryKey: ['qr-codes', id, 'revisions'] })
      const rev = (revisionsData?.data ?? []).find((r) => r.id === revisionId)
      const when = rev ? formatDateTime(rev.editedAt) : 'previous state'
      toast.success(`Restored to ${when}`)
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : 'Restore failed'
      toast.error(msg)
    },
  })

  const [editingDest, setEditingDest] = useState(false)
  const [destValue, setDestValue] = useState('')
  const [editingPw, setEditingPw] = useState(false)
  const [pwValue, setPwValue] = useState('')
  const [editingExpiry, setEditingExpiry] = useState(false)
  const [expiryValue, setExpiryValue] = useState('')
  const [editingMax, setEditingMax] = useState(false)
  const [maxValue, setMaxValue] = useState('')
  const [editingActivates, setEditingActivates] = useState(false)
  const [activatesValue, setActivatesValue] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  // Redirect rules (Pro+ feature)
  const [rules, setRules] = useState<RedirectRule[]>(code?.redirectRules ?? [])
  const [newRuleType, setNewRuleType] = useState<RedirectRule['type']>('device')
  const [newRuleValue, setNewRuleValue] = useState('')
  const [newRuleDest, setNewRuleDest] = useState('')

  const patchMut = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.patch<QrCodeRecord>(`/api/qr-codes/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qr-codes'] })
      qc.invalidateQueries({ queryKey: ['qr-codes', id] })
    },
    onError: () => toast.error('Update failed'),
  })
  const seedMut = useMutation({
    mutationFn: () => api.post('/api/seed', { qrCodeId: id }),
    onSuccess: () => {
      toast.success('Demo scans seeded')
      qc.invalidateQueries({ queryKey: ['qr-codes', id, 'analytics'] })
      qc.invalidateQueries({ queryKey: ['qr-codes'] })
      qc.invalidateQueries({ queryKey: ['qr-codes', id] })
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : 'Seeding failed'
      toast.error(msg)
    },
  })

  if (isLoading || !code) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    )
  }

  const typeDef = QR_TYPE_MAP[code.qrType]
  const TypeIcon = typeDef?.icon ?? QrCodeIcon
  const shortUrl = code.shortCode ? `createanqrcode.com/q/${code.shortCode}` : ''
  const folders = foldersData?.data ?? []
  const folder = folders.find((f) => f.id === code.folderId)
  const summary = analyticsData
  const top = summary?.topCountries?.[0]
  // Scheduled-activation flag: when activatesAt is set and is in the future,
  // the QR is not yet live and we show a "Scheduled" badge next to the status.
  const isScheduled = !!code.activatesAt && new Date(code.activatesAt) > new Date()

  // Range options are plan-gated: free=7d, starter=30d, pro=365d, business=unlimited.
  const maxRange = limits.analyticsDays ?? 99999
  const isRangeAllowed = (r: RangeKey) => {
    const opt = RANGE_OPTIONS.find((o) => o.key === r)!
    return opt.days <= maxRange
  }

  async function handleDownload(kind: 'png' | 'svg' | 'pdf' | 'eps') {
    try {
      const payload = code.staticPayload || code.destinationUrl || ''
      const filename = code.title.replace(/[^a-z0-9-_]+/gi, '_')
      if (kind === 'png') await downloadQrPng(payload, code.design, code.logoDataUrl, filename, code.overlayDataUrl, code.overlayOpacity)
      else if (kind === 'svg') await downloadQrSvg(payload, code.design, code.logoDataUrl, filename, code.overlayDataUrl, code.overlayOpacity)
      else if (kind === 'pdf') await downloadQrPdf(payload, code.design, code.logoDataUrl, filename, code.title, code.overlayDataUrl, code.overlayOpacity)
      else await downloadQrEps(payload, code.design, code.logoDataUrl, filename, code.overlayDataUrl, code.overlayOpacity)
      toast.success(`Downloading ${kind.toUpperCase()}`)
    } catch {
      toast.error('Download failed')
    }
  }

  function copyShort() {
    if (!shortUrl) return
    navigator.clipboard?.writeText(`https://${shortUrl}`)
    toast.success('Short URL copied')
  }

  function saveDest() {
    if (!destValue.trim()) return
    patchMut.mutate({ destinationUrl: destValue.trim() }, {
      onSuccess: () => { toast.success('Destination updated'); setEditingDest(false) },
    })
  }
  function savePw() {
    patchMut.mutate({ password: pwValue || '' }, {
      onSuccess: () => { toast.success(pwValue ? 'Password set' : 'Password removed'); setEditingPw(false); setPwValue('') },
    })
  }
  function saveExpiry() {
    patchMut.mutate({ expiresAt: expiryValue ? new Date(expiryValue).toISOString() : null }, {
      onSuccess: () => { toast.success('Expiry updated'); setEditingExpiry(false) },
    })
  }
  function saveActivates() {
    patchMut.mutate({ activatesAt: activatesValue ? new Date(activatesValue).toISOString() : null }, {
      onSuccess: () => { toast.success('Activation date updated'); setEditingActivates(false) },
    })
  }
  function saveMax() {
    patchMut.mutate({ maxScans: maxValue ? Number(maxValue) : null }, {
      onSuccess: () => { toast.success('Max scans updated'); setEditingMax(false) },
    })
  }
  function saveRules(next: RedirectRule[]) {
    setRules(next)
    patchMut.mutate({ redirectRules: next.length ? next : null }, {
      onSuccess: () => toast.success(next.length ? 'Redirect rules saved' : 'Redirect rules cleared'),
    })
  }
  function addRule() {
    const val = newRuleValue.trim()
    const dest = newRuleDest.trim()
    if (!val || !dest) { toast.error('Fill in the rule value and destination'); return }
    if (!/^https?:\/\//i.test(dest)) { toast.error('Destination must start with http:// or https://'); return }
    const rule: RedirectRule = { id: `r${Date.now()}`, type: newRuleType, value: val, destination: dest }
    saveRules([...rules, rule])
    setNewRuleValue(''); setNewRuleDest('')
  }
  function removeRule(rid: string) {
    saveRules(rules.filter((r) => r.id !== rid))
  }
  function addTag() {
    const t = tagInput.trim()
    if (!t) return
    if (code.tags.includes(t)) { setTagInput(''); return }
    patchMut.mutate({ tags: [...code.tags, t] }, {
      onSuccess: () => { setTagInput('') },
    })
  }
  function removeTag(t: string) {
    patchMut.mutate({ tags: code.tags.filter((x) => x !== t) })
  }
  function setFolder(folderId: string | null) {
    patchMut.mutate({ folderId }, {
      onSuccess: () => { toast.success('Folder updated'); setFolderDialogOpen(false) },
    })
  }
  function toggleStatus() {
    const next = code.status === 'paused' ? 'active' : 'paused'
    patchMut.mutate({ status: next }, {
      onSuccess: () => toast.success(next === 'active' ? 'QR code resumed' : 'QR code paused'),
    })
  }
  function convertToDynamic() {
    patchMut.mutate({ isDynamic: true }, {
      onSuccess: () => toast.success('Converted to dynamic — analytics enabled!'),
      onError: () => toast.error('Convert failed'),
    })
  }
  function saveTitle() {
    const t = titleValue.trim()
    if (!t) { setEditingTitle(false); return }
    patchMut.mutate({ title: t }, {
      onSuccess: () => { toast.success('Title updated'); setEditingTitle(false) },
    })
  }

  // Export this QR code's scans as CSV (Pro+). Fetches the full scan list
  // (up to 500 rows) rather than just the 50-row recent feed so the export
  // is genuinely useful for reporting.
  async function handleExportCSV() {
    try {
      const res = await api.get<{ data: ScanRecord[] }>(`/api/qr-codes/${id}/scans`)
      const rows = res.data
      const headers = ['scanned_at', 'country', 'country_code', 'city', 'device', 'os', 'browser', 'referrer', 'language']
      const lines = [headers.join(',')]
      for (const r of rows) {
        const cells = [
          r.scannedAt,
          r.countryName ?? '',
          r.countryCode ?? '',
          r.city ?? '',
          r.deviceType ?? '',
          r.os ?? '',
          r.browser ?? '',
          r.referrer ?? '',
          r.language ?? '',
        ].map((c) => `"${String(c).replace(/"/g, '""')}"`)
        lines.push(cells.join(','))
      }
      const csv = lines.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${code.title.replace(/[^a-z0-9-_]+/gi, '_')}-scans-${range}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${rows.length} scans`)
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('qr-codes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {editingTitle ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTitle() } if (e.key === 'Escape') setEditingTitle(false) }}
                    onBlur={saveTitle}
                    autoFocus
                    className="h-9 w-64 text-lg font-bold"
                  />
                  <Check className="h-4 w-4 text-brand" />
                </div>
              ) : (
                <>
                  <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{code.title}</h1>
                  <button
                    onClick={() => { setTitleValue(code.title); setEditingTitle(true) }}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Rename"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={() => patchMut.mutate({ favorite: !code.favorite })}
                className="rounded-md p-1 hover:bg-accent"
                aria-label="Toggle favorite"
              >
                <Star className={cn('h-4 w-4', code.favorite ? 'fill-foreground text-foreground' : 'text-muted-foreground')} />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <TypeIcon className="h-2.5 w-2.5" /> {typeDef?.label ?? code.qrType}
              </Badge>
              <StatusBadge status={code.status} />
              {code.isDynamic && (
                <Badge variant="outline" className="border-brand/40 text-[10px] text-brand">Dynamic</Badge>
              )}
              {isScheduled && (
                <Badge variant="outline" className="border-brand/40 text-[10px] text-brand">
                  <Clock className="mr-1 h-2.5 w-2.5" /> Scheduled
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button onClick={() => navigate('studio', { id: code.id })} className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Pencil className="mr-2 h-4 w-4" /> Edit QR Code
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: preview + downloads */}
        <Card className="border-border lg:col-span-1">
          <CardHeader><CardTitle className="text-base">QR Code</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-border">
              <QrPreview
                payload={code.staticPayload || code.destinationUrl || ''}
                design={code.design}
                logoDataUrl={code.logoDataUrl}
                overlayDataUrl={code.overlayDataUrl}
                overlayOpacity={code.overlayOpacity}
                size={280}
              />
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button onClick={() => handleDownload('png')} className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90">
                <Download className="mr-2 h-4 w-4" /> PNG
              </Button>
              <Button onClick={() => handleDownload('svg')} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" /> SVG
              </Button>
              <Button onClick={() => handleDownload('pdf')} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
              <Button onClick={() => handleDownload('eps')} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" /> EPS
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Center: scan simulation preview */}
        <Card className="border-border lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Scan Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <ScanPreview code={code} />
          </CardContent>
        </Card>

        {/* Right: details */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow icon={Calendar} label="Created" value={formatDateTime(code.createdAt)} />
              <DetailRow icon={Clock} label="Last edited" value={formatDateTime(code.updatedAt)} />
              <DetailRow icon={QrCodeIcon} label="Type" value={typeDef?.label ?? code.qrType} />
              <DetailRow icon={ShieldCheck} label="Error correction" value={code.design.errorCorrection} />

              {/* Tags */}
              <div className="flex items-start gap-3 pt-1">
                <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Tags</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {code.tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
                        #{t}
                        <button onClick={() => removeTag(t)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {code.tags.length === 0 && <span className="text-xs text-muted-foreground">No tags yet</span>}
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                      placeholder="+ add tag"
                      className="h-7 w-28 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Folder */}
              <div className="flex items-center gap-3 pt-1">
                <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Folder</p>
                  {folder ? (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: folder.color }} />
                      <span className="text-sm">{folder.name}</span>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted-foreground">Unfiled</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFolderDialogOpen(true)}>
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic details */}
          {code.isDynamic && (
            <Card className="border-brand/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-brand" />
                  Dynamic Code Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* Short URL */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Short URL</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="flex-1 truncate rounded-md border border-border bg-muted px-2 py-1.5 text-xs">
                      {shortUrl}
                    </code>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={copyShort}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button asChild variant="outline" size="icon" className="h-8 w-8">
                      <a href={`https://${shortUrl}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Destination */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Destination URL</p>
                    <Button variant="ghost" size="sm" onClick={() => { setDestValue(code.destinationUrl ?? ''); setEditingDest((v) => !v) }}>
                      <Pencil className="mr-1 h-3 w-3" /> {editingDest ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>
                  {editingDest ? (
                    <div className="flex gap-2">
                      <Input value={destValue} onChange={(e) => setDestValue(e.target.value)} placeholder="https://" className="text-xs" />
                      <Button size="sm" onClick={saveDest} className="bg-brand text-brand-foreground hover:bg-brand/90">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p className="truncate text-xs">{code.destinationUrl || '—'}</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={code.status} />
                    <Button variant="outline" size="sm" onClick={toggleStatus} disabled={patchMut.isPending}>
                      {code.status === 'paused' ? (
                        <><Play className="mr-1.5 h-3.5 w-3.5" /> Resume</>
                      ) : (
                        <><Pause className="mr-1.5 h-3.5 w-3.5" /> Pause</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Password protection</p>
                    <Button variant="ghost" size="sm" onClick={() => { setPwValue(''); setEditingPw((v) => !v) }}>
                      <Lock className="mr-1 h-3 w-3" /> {code.passwordHash ? 'Change' : 'Set'}
                    </Button>
                  </div>
                  {editingPw ? (
                    <div className="flex gap-2">
                      <Input type="password" value={pwValue} onChange={(e) => setPwValue(e.target.value)} placeholder="New password" className="text-xs" />
                      <Button size="sm" onClick={savePw} className="bg-brand text-brand-foreground hover:bg-brand/90">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{code.passwordHash ? 'Protected' : 'Not protected'}</p>
                  )}
                </div>

                {/* Expiry */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Expiry date</p>
                    <Button variant="ghost" size="sm" onClick={() => { setExpiryValue(code.expiresAt ? code.expiresAt.slice(0, 16) : ''); setEditingExpiry((v) => !v) }}>
                      <Calendar className="mr-1 h-3 w-3" /> {code.expiresAt ? 'Change' : 'Set'}
                    </Button>
                  </div>
                  {editingExpiry ? (
                    <div className="flex gap-2">
                      <Input type="datetime-local" value={expiryValue} onChange={(e) => setExpiryValue(e.target.value)} className="text-xs" />
                      <Button size="sm" onClick={saveExpiry} className="bg-brand text-brand-foreground hover:bg-brand/90">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{code.expiresAt ? formatDateTime(code.expiresAt) : 'No expiry'}</p>
                  )}
                </div>

                {/* Max scans */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Max scans</p>
                    <Button variant="ghost" size="sm" onClick={() => { setMaxValue(code.maxScans?.toString() ?? ''); setEditingMax((v) => !v) }}>
                      <Hash className="mr-1 h-3 w-3" /> {code.maxScans ? 'Change' : 'Set'}
                    </Button>
                  </div>
                  {editingMax ? (
                    <div className="flex gap-2">
                      <Input type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} placeholder="e.g. 1000" className="text-xs" />
                      <Button size="sm" onClick={saveMax} className="bg-brand text-brand-foreground hover:bg-brand/90">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {code.maxScans ? `${formatNumber(code.maxScans)} (used: ${formatNumber(code.scanCount)})` : 'Unlimited'}
                    </p>
                  )}
                </div>

                {/* Activation date */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Activation date</p>
                    <Button variant="ghost" size="sm" onClick={() => { setActivatesValue(code.activatesAt ? code.activatesAt.slice(0, 16) : ''); setEditingActivates((v) => !v) }}>
                      <Clock className="mr-1 h-3 w-3" /> {code.activatesAt ? 'Change' : 'Set'}
                    </Button>
                  </div>
                  {editingActivates ? (
                    <div className="flex gap-2">
                      <Input type="datetime-local" value={activatesValue} onChange={(e) => setActivatesValue(e.target.value)} className="text-xs" />
                      <Button size="sm" onClick={saveActivates} className="bg-brand text-brand-foreground hover:bg-brand/90">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {code.activatesAt
                        ? (isScheduled
                          ? `Activates ${formatDateTime(code.activatesAt)} (not yet live)`
                          : `Activated ${formatDateTime(code.activatesAt)}`)
                        : 'Active immediately'}
                    </p>
                  )}
                </div>

                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seedMut.mutate()}
                  disabled={seedMut.isPending}
                  className="w-full"
                >
                  {seedMut.isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                  )}
                  Seed demo scans
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Redirect Rules (Pro+ feature) — only for dynamic codes */}
          {code.isDynamic && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4 text-brand" />
                  Redirect Rules
                  {plan === 'free' && <Badge variant="secondary" className="text-[10px]">Pro+</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="text-xs text-muted-foreground">
                  Send scanners to different destinations based on their device, country, city, OS or browser. Rules are checked in order; the first match wins.
                </p>

                {/* Existing rules */}
                {rules.length > 0 && (
                  <div className="space-y-2">
                    {rules.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                        <Badge variant="outline" className="shrink-0 capitalize border-brand/40 text-brand text-[10px]">{r.type}</Badge>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{r.value}</p>
                          <p className="truncate text-[11px] text-muted-foreground">→ {r.destination}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeRule(r.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pro+ gate */}
                {plan === 'free' ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center">
                    <Lock className="mx-auto h-5 w-5 text-muted-foreground" />
                    <p className="mt-2 text-xs text-muted-foreground">Redirect rules are a Pro+ feature.</p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate('pricing')}>Upgrade to Pro</Button>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-lg border border-border p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as RedirectRule['type'])}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="device">Device</SelectItem>
                          <SelectItem value="country">Country</SelectItem>
                          <SelectItem value="city">City</SelectItem>
                          <SelectItem value="os">OS</SelectItem>
                          <SelectItem value="browser">Browser</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="h-9 text-xs"
                        value={newRuleValue}
                        onChange={(e) => setNewRuleValue(e.target.value)}
                        placeholder={
                          newRuleType === 'device' ? 'Mobile / Tablet / Desktop'
                          : newRuleType === 'country' ? 'IN / US / GB'
                          : newRuleType === 'city' ? 'Mumbai / New York / London'
                          : newRuleType === 'os' ? 'Android / iOS / Windows / macOS'
                          : 'Chrome / Safari / Firefox / Edge'
                        }
                      />
                    </div>
                    <Input
                      className="h-9 text-xs"
                      value={newRuleDest}
                      onChange={(e) => setNewRuleDest(e.target.value)}
                      placeholder="https://mobile-landing.example.com"
                    />
                    <Button size="sm" variant="outline" className="w-full" onClick={addRule} disabled={patchMut.isPending}>
                      {patchMut.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                      Add rule
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Analytics */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <TrendingUp className="h-5 w-5 text-brand" />
            Analytics
          </h2>
          <div className="flex items-center gap-2">
            {plan !== 'free' && code.isDynamic && (plan === 'pro' || plan === 'business') && (
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <DownloadIcon className="mr-1.5 h-3.5 w-3.5" /> Export CSV
              </Button>
            )}
            {plan !== 'free' && code.isDynamic && (
              <Button variant="ghost" size="sm" onClick={() => navigate('analytics')} className="text-brand">
                Full analytics <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {plan === 'free' ? (
          <Card className="relative overflow-hidden border-brand/30">
            <CardContent className="p-0">
              <div className="relative">
                {/* Blurred preview */}
                <div className="pointer-events-none select-none p-6 blur-sm" aria-hidden>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="rounded-xl border border-border bg-card p-4">
                        <div className="h-3 w-20 rounded bg-muted" />
                        <div className="mt-2 h-7 w-16 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-56 rounded-xl border border-border bg-card p-4">
                    <div className="h-full w-full rounded bg-gradient-to-br from-brand-muted/60 to-muted" />
                  </div>
                </div>
                {/* Lock overlay */}
                <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
                  <div className="max-w-md p-6 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-muted text-brand">
                      <Lock className="h-7 w-7" />
                    </div>
                    <h3 className="mt-4 text-xl font-bold">Unlock scan analytics</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Upgrade to a paid plan to see total scans, unique visitors, top countries,
                      devices, referrers and real-time activity for this QR code.
                    </p>
                    <Button onClick={() => navigate('billing')} className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90">
                      <Sparkles className="mr-2 h-4 w-4" /> Upgrade to unlock
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !code.isDynamic ? (
          <Card className="border-brand/30 bg-gradient-to-b from-brand-muted/20 to-transparent">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-muted text-brand">
                <Zap className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Enable scan analytics</h3>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                  This is a static QR code. Convert it to dynamic to track scans, see
                  countries &amp; devices, add password protection, and edit the destination
                  anytime — without reprinting.
                </p>
              </div>
              <Button
                onClick={convertToDynamic}
                disabled={patchMut.isPending}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {patchMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Convert to Dynamic
              </Button>
              <p className="text-[11px] text-muted-foreground">
                A short URL will be generated. The printed QR will redirect through it.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Period selector */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
              {RANGE_OPTIONS.map((opt) => {
                const allowed = isRangeAllowed(opt.key)
                const active = range === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => allowed && setRange(opt.key)}
                    disabled={!allowed}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all sm:text-sm',
                      active ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent',
                      !allowed && 'cursor-not-allowed opacity-40'
                    )}
                    title={!allowed ? 'Available on a higher plan' : undefined}
                  >
                    {opt.label}
                    {!allowed && <Lock className="h-3 w-3" />}
                  </button>
                )
              })}
            </div>

            {analyticsLoading || !summary ? (
              <div className="space-y-4">
                {/* Stat card skeletons */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl border border-border p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1.5">
                          <div className="skeleton-shimmer h-3 w-20 rounded" />
                          <div className="skeleton-shimmer h-6 w-16 rounded" />
                        </div>
                        <div className="skeleton-shimmer h-9 w-9 shrink-0 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="skeleton-shimmer h-64 w-full rounded-xl" />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="skeleton-shimmer h-48 w-full rounded-xl" />
                  <div className="skeleton-shimmer h-48 w-full rounded-xl" />
                </div>
              </div>
            ) : summary.total === 0 ? (
              <Card className="border-dashed border-border">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                    <BarChart3 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">No scans recorded yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Share your QR code to start collecting analytics. Scan data appears here in real time.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => seedMut.mutate()}
                    disabled={seedMut.isPending}
                  >
                    {seedMut.isPending ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                    )}
                    Seed demo scans
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  <StatCard
                    label="Total Scans"
                    value={formatNumber(summary.total)}
                    icon={BarChart3}
                    accent
                  />
                  <StatCard
                    label="Unique Visitors"
                    value={formatNumber(summary.unique)}
                    icon={Users}
                  />
                  <StatCard
                    label="Top Country"
                    value={top ? top.name : '—'}
                    hint={top ? `${formatNumber(top.count)} scans` : undefined}
                    icon={Globe}
                  />
                  <StatCard
                    label="Peak Time"
                    value={summary.peakHour >= 0 ? `${String(summary.peakHour).padStart(2, '0')}:00` : '—'}
                    hint={summary.peakHour >= 0 ? 'Busiest hour of day' : undefined}
                    icon={Clock}
                  />
                </div>

                {/* Scans Over Time */}
                <Card className="border-border">
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-base">Scans Over Time</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Daily scan volume vs unique visitors.
                      </p>
                    </div>
                    <Tabs value={granularity} onValueChange={(v) => setGranularity(v as typeof granularity)}>
                      <TabsList>
                        <TabsTrigger value="daily">Daily</TabsTrigger>
                        <TabsTrigger value="weekly">Weekly</TabsTrigger>
                        <TabsTrigger value="monthly">Monthly</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardHeader>
                  <CardContent>
                    <ScansOverTimeChart data={summary.overTime} granularity={granularity} />
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-3 rounded-sm" style={{ background: DEVICE_COLOR }} /> Total scans
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-3 rounded-sm" style={{ background: UNIQUE_COLOR }} /> Unique visitors
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Countries + Top Referrers */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle className="text-base">Top Countries</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">Where your scans come from.</p>
                    </CardHeader>
                    <CardContent>
                      <TopCountriesChart data={summary.topCountries} total={summary.total} />
                    </CardContent>
                  </Card>

                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle className="text-base">Top Referrers</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">Sources driving scans.</p>
                    </CardHeader>
                    <CardContent>
                      <TopReferrersList data={summary.referrers} />
                    </CardContent>
                  </Card>
                </div>

                {/* Device / OS / Browser donuts */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <DonutCard title="Device Breakdown" data={summary.devices} icon={Smartphone} />
                  <DonutCard title="Operating System" data={summary.oses} icon={Monitor} />
                  <DonutCard title="Browser" data={summary.browsers} icon={Globe} />
                </div>

                {/* Scan heatmap (Business only) */}
                {plan === 'business' && (
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle className="text-base">Scan Heatmap</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Activity by day of week and hour. Hover for count.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Heatmap data={summary.heatmap} />
                    </CardContent>
                  </Card>
                )}

                {/* Recent scans feed */}
                <Card className="border-brand/30">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Recent Scans</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">Latest scan events for this QR code.</p>
                    </div>
                    <Badge className="bg-brand-muted text-brand">
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                      Live
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <RecentScansFeed scans={summary.recent} emptyLabel="No scans in this period." />
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>

      {/* Revision History — timeline of past edits with one-click restore */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-brand" />
            Revision History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revisionsLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
            </div>
          ) : !revisionsData?.data || revisionsData.data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No edits yet — edits to this QR code will appear here.
            </p>
          ) : (
            <ol className="relative space-y-3 border-l border-border pl-5">
              {revisionsData.data.map((rev) => (
                <li key={rev.id} className="relative">
                  {/* Timeline dot */}
                  <span className="absolute -left-[26px] top-1.5 grid h-4 w-4 place-items-center rounded-full border border-border bg-card">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  </span>
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm font-medium">{rev.title}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">{rev.editedBy}</span>
                        {' · '}
                        {formatDateTime(rev.editedAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={restoreMut.isPending}
                      onClick={() => restoreMut.mutate(rev.id)}
                    >
                      {restoreMut.isPending && restoreMut.variables === rev.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Restore
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Folder dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
            <DialogDescription>Choose a folder for this QR code.</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto scroll-thin">
            <button
              onClick={() => setFolder(null)}
              className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              <span>No folder (unfile)</span>
              {!code.folderId && <Check className="h-4 w-4 text-brand" />}
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setFolder(f.id)}
                className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="h-3 w-3 rounded-full" style={{ background: f.color }} />
                <span className="flex-1 text-left">{f.name}</span>
                {code.folderId === f.id && <Check className="h-4 w-4 text-brand" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} code={code} />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  // Shape-based monochrome status badges (no color) per spec Section 1.8
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-foreground/5 text-foreground border-border' },
    paused: { label: 'Paused', className: 'bg-muted text-muted-foreground border-border' },
    expired: { label: 'Expired', className: 'bg-muted text-muted-foreground border-border' },
    archived: { label: 'Archived', className: 'bg-muted text-muted-foreground border-border' },
    trashed: { label: 'Trashed', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  }
  const cfg = map[status] ?? map.active
  return (
    <Badge variant="outline" className={cn('text-[10px] font-medium', cfg.className)}>
      {cfg.label}
    </Badge>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm">{value}</p>
      </div>
    </div>
  )
}

export default QrDetailView
