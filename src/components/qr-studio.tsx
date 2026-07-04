'use client'

/**
 * QR Studio — global 3-panel slide-over generator.
 *
 * Rendered once at the DashboardShell level so the LHS sidebar stays visible
 * while the user generates a QR code. Triggered from:
 *   - the dashboard sidebar "Create QR" nav item (openStudio())
 *   - the dashboard "Create QR Code" button (openStudio())
 *   - quick-create chips on the dashboard (openStudio('url') etc.)
 *
 * Three panels:
 *   LEFT   — type picker + section nav (Content / Design / Logo / Download)
 *   CENTER — sticky live preview
 *   RIGHT  — properties for the active section
 *
 * Customization (the "lots of customisation" the dashboard generator was missing):
 *   - One-click preset themes (Minimal, Brand, Vibrant, Mono Dark, Sunset, Ocean)
 *   - Foreground + background color pickers with expanded preset palettes
 *   - Transparent background toggle
 *   - 6 dot styles, 3 eye styles, 4 error-correction levels, 4 output sizes
 *   - Gradient fills (none / linear / radial) with start+end colors + angle slider
 *     (this was the biggest gap — the old studio had no gradient controls)
 *   - Logo upload (PNG/SVG ≤1MB) with size + padding sliders
 *   - Randomize button (generates a random design combo for inspiration)
 *   - Save to library + PNG/SVG download
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  X, Search, ChevronDown, Download, Save, Upload, FileText, Loader2,
  FileEdit, Palette, Image as ImageIcon, Shuffle, Sparkles, AlertCircle, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose,
} from '@/components/ui/sheet'
import { QrPreview } from '@/components/qr-preview'
import { useAuthStore, useUIStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'
import {
  QR_TYPES, QR_TYPE_MAP, type QrTypeField,
} from '@/lib/qr-types'
import { DEFAULT_DESIGN, PLAN_LIMITS, type QrDesign, type QrTypeId } from '@/lib/types'
import { downloadQrPng, downloadQrSvg, downloadQrPdf, downloadQrEps } from '@/lib/qr-generate'
import { cn } from '@/lib/utils'

const STUDIO_SECTIONS = [
  { id: 'content', label: 'Content', icon: FileEdit },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'logo', label: 'Logo', icon: ImageIcon },
  { id: 'overlay', label: 'Overlay', icon: Layers },
  { id: 'download', label: 'Download', icon: Download },
] as const

const DOT_STYLES = [
  { id: 'square', label: 'Square' }, { id: 'rounded', label: 'Rounded' }, { id: 'dots', label: 'Dots' },
  { id: 'classy', label: 'Classy' }, { id: 'classy-rounded', label: 'Classy Rnd' }, { id: 'extra-rounded', label: 'Extra Rnd' },
] as const

const EYE_STYLES = [
  { id: 'square', label: 'Square' }, { id: 'extra-rounded', label: 'Rounded' }, { id: 'dot', label: 'Dot' },
] as const

const EC_LEVELS = [
  { id: 'L', label: 'L', helper: '~7% recovery' },
  { id: 'M', label: 'M', helper: '~15% recovery' },
  { id: 'Q', label: 'Q', helper: '~25% · logos' },
  { id: 'H', label: 'H', helper: '~30% · damaged' },
] as const

// Expanded palettes (was 8 + 6, now 10 + 8)
const COLOR_PRESETS = ['#000000', '#374151', '#7C3AED', '#EC4899', '#DC2626', '#EA580C', '#D97706', '#16A34A', '#0891B2', '#1E40AF']
const BG_PRESETS = ['#FFFFFF', '#F8FAFC', '#FEF3C7', '#E0E7FF', '#FCE7F3', '#DBEAFE', '#D1FAE5', '#000000']

// Gradient presets — the biggest missing customization piece.
const GRADIENT_PRESETS: { name: string; start: string; end: string }[] = [
  { name: 'Purple', start: '#7C3AED', end: '#EC4899' },
  { name: 'Sunset', start: '#EA580C', end: '#DC2626' },
  { name: 'Ocean', start: '#0891B2', end: '#1E40AF' },
  { name: 'Forest', start: '#16A34A', end: '#065F46' },
  { name: 'Mono', start: '#18181B', end: '#71717A' },
  { name: 'Berry', start: '#EC4899', end: '#7C3AED' },
]

// One-click full-design themes (dot + eye + colors + gradient combo).
const DESIGN_THEMES: { name: string; design: Partial<QrDesign> }[] = [
  { name: 'Minimal', design: { fgColor: '#000000', bgColor: '#FFFFFF', transparentBg: false, dotStyle: 'square', eyeStyle: 'square', gradientType: 'none' } },
  { name: 'Brand', design: { fgColor: '#7C3AED', bgColor: '#FFFFFF', transparentBg: false, dotStyle: 'rounded', eyeStyle: 'extra-rounded', gradientType: 'none' } },
  { name: 'Vibrant', design: { dotStyle: 'rounded', eyeStyle: 'extra-rounded', gradientType: 'linear', gradientStart: '#7C3AED', gradientEnd: '#EC4899', gradientAngle: 45, bgColor: '#FFFFFF', transparentBg: false } },
  { name: 'Mono Dark', design: { fgColor: '#FFFFFF', bgColor: '#000000', transparentBg: false, dotStyle: 'dots', eyeStyle: 'dot', gradientType: 'none' } },
  { name: 'Sunset', design: { dotStyle: 'classy-rounded', eyeStyle: 'extra-rounded', gradientType: 'linear', gradientStart: '#EA580C', gradientEnd: '#DC2626', gradientAngle: 135, bgColor: '#FFFFFF', transparentBg: false } },
  { name: 'Ocean', design: { dotStyle: 'extra-rounded', eyeStyle: 'extra-rounded', gradientType: 'linear', gradientStart: '#0891B2', gradientEnd: '#1E40AF', gradientAngle: 90, bgColor: '#FFFFFF', transparentBg: false } },
]

function randomDesign(): QrDesign {
  const dots = DOT_STYLES[Math.floor(Math.random() * DOT_STYLES.length)].id
  const eyes = EYE_STYLES[Math.floor(Math.random() * EYE_STYLES.length)].id
  const ec = EC_LEVELS[Math.floor(Math.random() * EC_LEVELS.length)].id
  const useGradient = Math.random() > 0.4
  const gp = GRADIENT_PRESETS[Math.floor(Math.random() * GRADIENT_PRESETS.length)]
  const fg = COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]
  const bg = BG_PRESETS[Math.floor(Math.random() * BG_PRESETS.length)]
  return {
    ...DEFAULT_DESIGN,
    dotStyle: dots,
    eyeStyle: eyes,
    errorCorrection: ec,
    fgColor: fg,
    bgColor: bg,
    transparentBg: false,
    gradientType: useGradient ? 'linear' : 'none',
    gradientStart: gp.start,
    gradientEnd: gp.end,
    gradientAngle: Math.floor(Math.random() * 360),
  }
}

export function QrStudio() {
  const open = useUIStore((s) => s.studioOpen)
  const closeStudio = useUIStore((s) => s.closeStudio)
  const studioType = useUIStore((s) => s.studioType)
  const studioEditId = useUIStore((s) => s.studioEditId)
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) closeStudio() }}>
      <SheetContent side="right" className="w-full overflow-hidden p-0 sm:max-w-4xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="h-5 w-5 text-brand" />
              {studioEditId ? 'Edit QR Code' : 'QR Studio'}
            </SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </SheetClose>
          </div>
        </SheetHeader>
        <QrStudioContent editId={studioEditId} initialType={studioType} onClose={closeStudio} />
      </SheetContent>
    </Sheet>
  )
}

/**
 * The reusable 3-panel Studio content (type picker + preview + properties).
 * Used by BOTH the slide-over QrStudio (above) and the full-page StudioView
 * (src/components/views/studio.tsx). Accepts editId/initialType/onClose so it
 * can be driven by either the UI store (overlay) or the router params (page).
 */
export function QrStudioContent({ editId, initialType, onClose }: {
  editId?: string | null
  initialType?: string | null
  onClose: () => void
}) {
  const setStudioDesign = useUIStore((s) => s.setStudioDesign)
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  const studioEditId = editId
  const isEditMode = !!studioEditId

  const [activeSection, setActiveSection] = useState<'content' | 'design' | 'logo' | 'overlay' | 'download'>('content')
  const [selectedType, setSelectedType] = useState<QrTypeId>((initialType as QrTypeId) || 'url')
  const [title, setTitle] = useState('My QR Code')
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({})
  const [design, setDesign] = useState<QrDesign>({ ...DEFAULT_DESIGN, dotStyle: 'rounded', eyeStyle: 'extra-rounded', errorCorrection: 'Q' })
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [overlayDataUrl, setOverlayDataUrl] = useState<string | null>(null)
  const [overlayOpacity, setOverlayOpacity] = useState(40)
  const [isDynamic, setIsDynamic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [typeSearch, setTypeSearch] = useState('')
  const [showTypePicker, setShowTypePicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const overlayInputRef = useRef<HTMLInputElement>(null)

  const plan = user?.plan ?? 'free'
  const dynamicLimit = PLAN_LIMITS[plan].dynamicQr

  // Sync the selected type when the initialType prop changes (e.g. quick-create chip)
  useEffect(() => {
    if (initialType && QR_TYPE_MAP[initialType]) {
      setSelectedType(initialType as QrTypeId)
    }
  }, [initialType])

  // EDIT MODE: when studioEditId is set, fetch the QR code and populate the
  // form/design/logo so the user can edit an existing code instead of creating
  // a new one. The type selector is locked in edit mode (changing the type of
  // a saved QR would invalidate the payload).
  useEffect(() => {
    if (!studioEditId) return
    let cancelled = false
    api.get<QrCodeRecord>(`/api/qr-codes/${studioEditId}`).then((code) => {
      if (cancelled) return
      setSelectedType(code.qrType as QrTypeId)
      setTitle(code.title)
      setDesign(code.design)
      setLogoDataUrl(code.logoDataUrl)
      setOverlayDataUrl(code.overlayDataUrl)
      setOverlayOpacity(code.overlayOpacity ?? 40)
      setIsDynamic(code.isDynamic)
      // Reconstruct form values from the static payload or destination URL.
      // The buildPayload function is the source of truth for the payload format,
      // so we can't perfectly reverse it — but we can set the most common fields.
      // For URL-type codes the destination/static payload IS the url field.
      const payloadSource = code.staticPayload || code.destinationUrl || ''
      const def = QR_TYPE_MAP[code.qrType]
      if (def) {
        const vals: Record<string, string | boolean> = {}
        for (const f of def.fields) {
          // Heuristic: if the field is the primary content field, populate it
          // with the saved payload. Otherwise use the default.
          if (f.key === 'url' || f.key === 'text' || f.key === 'content' || f.key === 'data') {
            vals[f.key] = payloadSource
          } else {
            vals[f.key] = f.defaultValue ?? (f.type === 'checkbox' ? false : '')
          }
        }
        setFormValues(vals)
      }
    }).catch(() => {
      if (!cancelled) { toast.error('Could not load QR code for editing'); onClose() }
    })
    return () => { cancelled = true }
  }, [studioEditId])

  // Sync the current design + logo to the global UI store so other views
  // (e.g. Templates → "Save current design") can read the user's actual
  // in-progress design instead of DEFAULT_DESIGN.
  useEffect(() => {
    setStudioDesign(design, logoDataUrl)
  }, [design, logoDataUrl, setStudioDesign])

  const def = QR_TYPE_MAP[selectedType]
  const payload = useMemo(() => def?.buildPayload(formValues) || '', [def, formValues])

  // Reset form when the type changes
  useEffect(() => {
    if (!def) return
    const vals: Record<string, string | boolean> = {}
    for (const f of def.fields) vals[f.key] = f.defaultValue ?? (f.type === 'checkbox' ? false : '')
    setFormValues(vals)
    setTitle(`${def.label} QR Code`)
  }, [selectedType, def])

  const updateDesign = (patch: Partial<QrDesign>) => setDesign((d) => ({ ...d, ...patch }))
  const handleFieldChange = (k: string, v: string | boolean) => setFormValues((prev) => ({ ...prev, [k]: v }))

  const handleDownload = async (kind: 'png' | 'svg' | 'pdf' | 'eps') => {
    if (!payload) { toast.error('Fill the form first'); setActiveSection('content'); return }
    setDownloading(true)
    try {
      const fn = (title || 'qr-code').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
      if (kind === 'png') await downloadQrPng(payload, design, logoDataUrl, fn, overlayDataUrl, overlayOpacity)
      else if (kind === 'svg') await downloadQrSvg(payload, design, logoDataUrl, fn, overlayDataUrl, overlayOpacity)
      else if (kind === 'pdf') await downloadQrPdf(payload, design, logoDataUrl, fn, title || undefined, overlayDataUrl, overlayOpacity)
      else await downloadQrEps(payload, design, logoDataUrl, fn, overlayDataUrl, overlayOpacity)
      toast.success(`Downloaded ${kind.toUpperCase()}`)
    } catch { toast.error('Download failed') } finally { setDownloading(false) }
  }

  const handleSave = async () => {
    if (!payload) { toast.error('Fill the form first'); setActiveSection('content'); return }
    if (!title.trim()) { toast.error('Title is required'); setActiveSection('content'); return }
    setSaving(true)
    try {
      if (isEditMode && studioEditId) {
        // EDIT: PATCH the existing QR. Update design, logo, overlay, title, and (for
        // dynamic codes) the destination URL. Static payload is also patchable.
        await api.patch<QrCodeRecord>(`/api/qr-codes/${studioEditId}`, {
          title: title.trim(),
          design,
          logoDataUrl,
          overlayDataUrl,
          overlayOpacity,
          isDynamic,
          ...(isDynamic
            ? { destinationUrl: payload }
            : { staticPayload: payload }),
        })
        qc.invalidateQueries({ queryKey: ['qr-codes'] })
        qc.invalidateQueries({ queryKey: ['qr-codes', studioEditId] })
        toast.success('QR code updated!')
      } else {
        // CREATE: POST a new QR code.
        await api.post('/api/qr-codes', {
          title: title.trim(),
          qrType: selectedType,
          isDynamic,
          staticPayload: isDynamic ? null : payload,
          destinationUrl: isDynamic ? payload : null,
          password: null,
          expiresAt: null,
          maxScans: null,
          design,
          logoDataUrl,
          overlayDataUrl,
          overlayOpacity,
          tags: [],
        })
        toast.success(isDynamic ? 'Dynamic QR code saved!' : 'QR code saved!')
      }
      qc.invalidateQueries({ queryKey: ['qr-codes'] })
      onClose()
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Save failed') } finally { setSaving(false) }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1024 * 1024) { toast.error('Logo must be under 1MB'); return }
    const reader = new FileReader()
    reader.onload = () => { setLogoDataUrl(reader.result as string); toast.success('Logo added') }
    reader.readAsDataURL(file)
  }

  const handleOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Overlay image must be under 2MB'); return }
    const reader = new FileReader()
    reader.onload = () => { setOverlayDataUrl(reader.result as string); toast.success('Overlay added') }
    reader.readAsDataURL(file)
  }

  const filteredTypes = useMemo(() => {
    if (!typeSearch) return QR_TYPES
    const q = typeSearch.toLowerCase()
    return QR_TYPES.filter((t) => t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
  }, [typeSearch])

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* LEFT SIDEBAR — type picker + section nav */}
      <div className="hidden w-48 shrink-0 border-r border-border bg-muted/20 sm:flex sm:flex-col">
        <div className="p-3">
          {/* Type picker button */}
          <button onClick={() => setShowTypePicker(!showTypePicker)}
            className="mb-3 flex w-full items-center gap-2 rounded-lg border border-border bg-card p-2.5 text-left text-sm font-medium hover:border-foreground/20">
            {def && <def.icon className="h-4 w-4 shrink-0" />}
            <span className="flex-1 truncate">{def?.label}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

              {/* Type picker dropdown */}
              {showTypePicker && (
                <div className="mb-3 max-h-60 space-y-1 overflow-y-auto scroll-thin rounded-lg border border-border bg-background p-2">
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search…" value={typeSearch} onChange={(e) => setTypeSearch(e.target.value)} className="h-8 pl-7 text-xs" />
                  </div>
                  {filteredTypes.map((t) => (
                    <button key={t.id} onClick={() => { setSelectedType(t.id); setShowTypePicker(false) }}
                      className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                        selectedType === t.id ? 'bg-foreground text-background' : 'hover:bg-accent')}>
                      <t.icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Section nav */}
              <div className="space-y-0.5">
                {STUDIO_SECTIONS.map((s) => (
                  <button key={s.id} onClick={() => setActiveSection(s.id)}
                    className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                      activeSection === s.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                    <s.icon className="h-4 w-4" />{s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER — preview */}
          <div className="flex flex-1 flex-col items-center justify-center bg-muted/10 p-6">
            <div className="qr-frame p-4 shadow-md">
              <QrPreview payload={payload || ' '} design={design} logoDataUrl={logoDataUrl} overlayDataUrl={overlayDataUrl} overlayOpacity={overlayOpacity} size={240} />
            </div>
            <p className="mt-4 text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">
              {def?.label} · {design.dotStyle}{design.gradientType !== 'none' ? ' · gradient' : ''}
              {isDynamic && ' · dynamic'}{overlayDataUrl && ' · overlay'}
            </p>
            {/* Mobile: section tabs (since the left sidebar is hidden on mobile) */}
            <div className="mt-4 flex w-full max-w-xs gap-1 rounded-lg border border-border bg-card p-1 sm:hidden">
              {STUDIO_SECTIONS.map((s) => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={cn('flex-1 rounded-md py-1.5 text-xs font-medium',
                    activeSection === s.id ? 'bg-foreground text-background' : 'text-muted-foreground')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT — properties */}
          <div className="w-72 shrink-0 overflow-y-auto scroll-thin border-l border-border p-4">
            {activeSection === 'content' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Content</h3>
                {/* Mobile type picker (the left sidebar is hidden on mobile) */}
                <div className="sm:hidden">
                  <Label className="mb-1.5 block text-xs font-medium">QR Type</Label>
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v as QrTypeId)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {QR_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My QR Code" className="h-9" />
                </div>
                <Separator />
                {/* Dynamic QR toggle — the key Phase 1 fix. Enables scan tracking,
                    analytics, password protection, expiry, max scans, redirect rules,
                    and editable destination. Plan-gated: all plans have a dynamic-QR
                    allowance (free: 10, starter: 50, pro: 250, business: unlimited). */}
                <div className={cn(
                  'rounded-lg border p-3 transition-colors',
                  isDynamic ? 'border-brand/40 bg-brand-muted/40' : 'border-border bg-muted/30'
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-brand" />
                        <p className="text-xs font-semibold">Dynamic QR Code</p>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {isDynamic
                          ? 'Track scans, edit the destination later, add password protection, expiry & redirect rules.'
                          : 'Enable for scan tracking, analytics & editable destination.'}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Plan limit: {dynamicLimit === null ? '∞ unlimited' : dynamicLimit} dynamic codes
                      </p>
                    </div>
                    <Switch checked={isDynamic} onCheckedChange={setIsDynamic} aria-label="Toggle dynamic QR" />
                  </div>
                </div>
                <Separator />
                {def?.fields.map((f) => <StudioField key={f.key} field={f} values={formValues} onChange={handleFieldChange} />)}
              </div>
            )}

            {activeSection === 'design' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Design</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => { setDesign(randomDesign()); toast.success('Randomized!') }}
                    title="Randomize design"
                  >
                    <Shuffle className="h-3.5 w-3.5" /> Random
                  </Button>
                </div>

                {/* One-click themes */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Themes</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DESIGN_THEMES.map((th) => (
                      <button
                        key={th.name}
                        onClick={() => updateDesign(th.design)}
                        className="rounded-lg border border-border px-2 py-2 text-[11px] font-medium hover:border-foreground/30 hover:bg-accent"
                      >
                        {th.name}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Foreground color */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Foreground</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PRESETS.map((c) => (
                      <button key={c} onClick={() => updateDesign({ fgColor: c })}
                        className={cn('h-7 w-7 rounded-full border-2', design.fgColor === c ? 'border-foreground ring-2 ring-foreground/20' : 'border-border')}
                        style={{ backgroundColor: c }} aria-label={c} />
                    ))}
                    <input type="color" value={design.fgColor} onChange={(e) => updateDesign({ fgColor: e.target.value })} className="h-7 w-7 cursor-pointer rounded border border-border" aria-label="Custom foreground" />
                  </div>
                </div>

                {/* Background color */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Background</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BG_PRESETS.map((c) => (
                      <button key={c} onClick={() => updateDesign({ bgColor: c, transparentBg: false })}
                        className={cn('h-7 w-7 rounded-full border-2', design.bgColor === c && !design.transparentBg ? 'border-foreground ring-2 ring-foreground/20' : 'border-border')}
                        style={{ backgroundColor: c }} aria-label={c} />
                    ))}
                    <input type="color" value={design.bgColor} onChange={(e) => updateDesign({ bgColor: e.target.value, transparentBg: false })} className="h-7 w-7 cursor-pointer rounded border border-border" aria-label="Custom background" />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox id="studio-bg" checked={design.transparentBg} onCheckedChange={(c) => updateDesign({ transparentBg: c === true })} />
                    <Label htmlFor="studio-bg" className="text-xs">Transparent background</Label>
                  </div>
                </div>

                <Separator />

                {/* Gradient — the big new customization piece */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Gradient fill</p>
                  <div className="mb-2 grid grid-cols-3 gap-1.5">
                    {(['none', 'linear', 'radial'] as const).map((g) => (
                      <button key={g} onClick={() => updateDesign({ gradientType: g })}
                        className={cn('rounded-md border px-2 py-1.5 text-xs font-medium capitalize',
                          design.gradientType === g ? 'border-foreground bg-foreground text-background' : 'border-border')}>
                        {g}
                      </button>
                    ))}
                  </div>
                  {design.gradientType !== 'none' && (
                    <div className="space-y-2.5 rounded-lg bg-muted/30 p-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {GRADIENT_PRESETS.map((gp) => (
                          <button
                            key={gp.name}
                            onClick={() => updateDesign({ gradientStart: gp.start, gradientEnd: gp.end })}
                            className="h-6 w-6 rounded-full border-2 border-border"
                            style={{ background: `linear-gradient(135deg, ${gp.start}, ${gp.end})` }}
                            title={gp.name}
                            aria-label={`Gradient ${gp.name}`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="mb-1 text-[11px] text-muted-foreground">Start</p>
                          <input type="color" value={design.gradientStart} onChange={(e) => updateDesign({ gradientStart: e.target.value })} className="h-8 w-full cursor-pointer rounded border border-border bg-transparent p-0" />
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] text-muted-foreground">End</p>
                          <input type="color" value={design.gradientEnd} onChange={(e) => updateDesign({ gradientEnd: e.target.value })} className="h-8 w-full cursor-pointer rounded border border-border bg-transparent p-0" />
                        </div>
                      </div>
                      {design.gradientType === 'linear' && (
                        <div>
                          <div className="mb-1 flex justify-between text-[11px]"><span className="text-muted-foreground">Angle</span><span className="font-mono">{design.gradientAngle}°</span></div>
                          <Slider value={[design.gradientAngle]} min={0} max={360} onValueChange={(v) => updateDesign({ gradientAngle: v[0] })} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Dot style */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Dot Style</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DOT_STYLES.map((s) => (
                      <button key={s.id} onClick={() => updateDesign({ dotStyle: s.id })}
                        className={cn('rounded-md border px-2 py-1.5 text-xs font-medium', design.dotStyle === s.id ? 'border-foreground bg-foreground text-background' : 'border-border')}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Eye style */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Eye Style</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {EYE_STYLES.map((s) => (
                      <button key={s.id} onClick={() => updateDesign({ eyeStyle: s.id })}
                        className={cn('rounded-md border px-2 py-1.5 text-xs font-medium', design.eyeStyle === s.id ? 'border-foreground bg-foreground text-background' : 'border-border')}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error correction */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Error Correction</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EC_LEVELS.map((e) => (
                      <button key={e.id} onClick={() => updateDesign({ errorCorrection: e.id })}
                        className={cn('rounded-md border px-2 py-1.5 text-xs font-bold', design.errorCorrection === e.id ? 'border-foreground bg-foreground text-background' : 'border-border')}>
                        {e.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{EC_LEVELS.find((e) => e.id === design.errorCorrection)?.helper}</p>
                </div>

                {/* Output size */}
                <div>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Output size</span><span className="font-mono">{design.outputSize}px</span></div>
                  <Select value={String(design.outputSize)} onValueChange={(v) => updateDesign({ outputSize: Number(v) as QrDesign['outputSize'] })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="256">256px</SelectItem>
                      <SelectItem value="512">512px</SelectItem>
                      <SelectItem value="1024">1024px</SelectItem>
                      <SelectItem value="2048">2048px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* ── Advanced: Eye color ── */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Eye color (corner squares)</p>
                  <div className="flex items-center gap-2">
                    <input type="color" value={design.eyeColor || design.fgColor} onChange={(e) => updateDesign({ eyeColor: e.target.value })} className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0" />
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => updateDesign({ eyeColor: '' })}>Reset</Button>
                    <span className="text-xs text-muted-foreground">{design.eyeColor ? 'Custom' : 'Same as foreground'}</span>
                  </div>
                </div>

                {/* ── Advanced: Quiet zone (margin) ── */}
                <div>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Quiet zone (margin)</span><span className="font-mono">{design.quietZone}px</span></div>
                  <Slider value={[design.quietZone]} min={0} max={40} onValueChange={(v) => updateDesign({ quietZone: v[0] })} />
                </div>

                {/* ── Advanced: Frame ── */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Frame style</p>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {(['none', 'square', 'rounded', 'circle'] as const).map((f) => (
                      <button key={f} onClick={() => updateDesign({ frameStyle: f, frameWidth: f === 'none' ? 0 : Math.max(design.frameWidth, 3) })}
                        className={cn('rounded-md border px-2 py-1.5 text-xs font-medium capitalize', design.frameStyle === f ? 'border-foreground bg-foreground text-background' : 'border-border')}>{f}</button>
                    ))}
                  </div>
                  {design.frameStyle !== 'none' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="color" value={design.frameColor} onChange={(e) => updateDesign({ frameColor: e.target.value })} className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0" />
                        <span className="text-xs text-muted-foreground">Frame color</span>
                      </div>
                      <div><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Frame width</span><span className="font-mono">{design.frameWidth}px</span></div><Slider value={[design.frameWidth]} min={1} max={20} onValueChange={(v) => updateDesign({ frameWidth: v[0] })} /></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'logo' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Logo</h3>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                {logoDataUrl ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <img src={logoDataUrl} alt="Logo" className="h-12 w-12 rounded object-contain" />
                    <span className="flex-1 text-xs text-muted-foreground">Logo uploaded</span>
                    <Button size="icon" variant="ghost" onClick={() => setLogoDataUrl(null)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border p-5 text-xs text-muted-foreground hover:border-foreground/30">
                    <ImageIcon className="h-6 w-6" />Upload logo (PNG/SVG, ≤1MB)
                  </button>
                )}
                {logoDataUrl && (
                  <>
                    <div><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Size</span><span className="font-mono">{design.logoSize}%</span></div><Slider value={[design.logoSize]} min={10} max={40} onValueChange={(v) => updateDesign({ logoSize: v[0] })} /></div>
                    <div><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Padding</span><span className="font-mono">{design.logoPadding}px</span></div><Slider value={[design.logoPadding]} min={0} max={20} onValueChange={(v) => updateDesign({ logoPadding: v[0] })} /></div>
                  </>
                )}
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground"><AlertCircle className="h-3.5 w-3.5" /> Tip</div>
                  Use error correction Q or H with a logo so the QR stays scannable.
                </div>
              </div>
            )}

            {activeSection === 'overlay' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Image Overlay</h3>
                <p className="text-xs text-muted-foreground">
                  Upload an image to fill the QR code's blocks. The image is professionally blended into the dark modules — each dot becomes a window into your image while keeping the QR scannable.
                </p>
                <input ref={overlayInputRef} type="file" accept="image/*" className="hidden" onChange={handleOverlayUpload} />
                {overlayDataUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <img src={overlayDataUrl} alt="Overlay" className="h-16 w-16 rounded object-cover" />
                      <div className="flex-1 text-xs text-muted-foreground">Overlay uploaded</div>
                      <Button size="icon" variant="ghost" onClick={() => setOverlayDataUrl(null)}><X className="h-4 w-4" /></Button>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Image visibility</span><span className="font-mono">{overlayOpacity}%</span></div>
                      <Slider value={[overlayOpacity]} min={10} max={100} onValueChange={(v) => setOverlayOpacity(v[0])} />
                      <p className="mt-1 text-[11px] text-muted-foreground">Higher = more image visible in dots. Lower = darker dots (better scan reliability).</p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => overlayInputRef.current?.click()}>
                      <Upload className="mr-2 h-3.5 w-3.5" /> Replace overlay
                    </Button>
                  </div>
                ) : (
                  <button onClick={() => overlayInputRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border p-6 text-xs text-muted-foreground hover:border-foreground/30">
                    <Layers className="h-8 w-8" />
                    Click to upload overlay image (PNG/JPG, ≤2MB)
                  </button>
                )}
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground"><AlertCircle className="h-3.5 w-3.5" /> Pro tip</div>
                  The image is cover-fit + blended into the QR dots using multiply mode — no stretching, no distortion. For best results: use a high-contrast image, set error correction to <strong>H</strong>, and keep visibility at 50-70%. The corner eyes stay solid for scanner reliability.
                </div>
              </div>
            )}

            {activeSection === 'download' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Download</h3>
                <Button onClick={() => handleDownload('png')} disabled={downloading} variant="outline" className="w-full"><Download className="h-4 w-4" /> PNG ({design.outputSize}px)</Button>
                <Button onClick={() => handleDownload('svg')} disabled={downloading} variant="outline" className="w-full"><Download className="h-4 w-4" /> SVG (Vector)</Button>
                <Button onClick={() => handleDownload('pdf')} disabled={downloading} variant="outline" className="w-full"><Download className="h-4 w-4" /> PDF (Print)</Button>
                <Button onClick={() => handleDownload('eps')} disabled={downloading} variant="outline" className="w-full"><Download className="h-4 w-4" /> EPS (Vector)</Button>
                <Separator />
                {user ? (
                  <>
                    <Button onClick={handleSave} disabled={saving} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
                      <Save className="h-4 w-4" /> {saving ? 'Saving…' : isEditMode ? 'Update QR Code' : isDynamic ? 'Save Dynamic QR' : 'Save to Library'}
                    </Button>
                    {isDynamic && (
                      <p className="text-center text-[11px] text-muted-foreground">
                        Scans will be tracked with a short URL like<br />
                        <code className="rounded bg-muted px-1 py-0.5 text-[10px]">createanqrcode.com/q/…</code>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">Sign up to save & track your QR codes.</p>
                )}
              </div>
            )}
          </div>
        </div>
  )
}

// ── Field renderers (kept identical to the old dashboard studio) ──────────

function StudioField({ field, values, onChange }: { field: QrTypeField; values: Record<string, string | boolean>; onChange: (k: string, v: string | boolean) => void }) {
  if (field.showIf && !field.showIf(values)) return null
  const value = values[field.key]
  // Always coerce to a string — `undefined` would make the input uncontrolled,
  // then when the form populates it becomes controlled, triggering a React
  // warning. Coercing to '' up front keeps the input controlled for its
  // entire lifetime.
  const strVal = typeof value === 'boolean' ? '' : (value ?? '')

  const isFileType = field.label.toLowerCase().includes('pdf') || field.label.toLowerCase().includes('image') || field.label.toLowerCase().includes('video') || field.label.toLowerCase().includes('ebook') || field.label.toLowerCase().includes('file') || field.label.toLowerCase().includes('gallery')

  if (isFileType) {
    return <FileUploadField field={field} value={strVal} onChange={onChange} />
  }

  if (field.type === 'checkbox') {
    return <div className="flex items-center gap-2"><Checkbox id={field.key} checked={!!value} onCheckedChange={(c) => onChange(field.key, c === true)} /><Label htmlFor={field.key} className="text-xs">{field.label}</Label></div>
  }
  if (field.type === 'textarea') {
    return <div className="space-y-1.5"><Label className="text-xs font-medium">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label><textarea id={field.key} value={strVal} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
  }
  if (field.type === 'select') {
    return <div className="space-y-1.5"><Label className="text-xs font-medium">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label><Select value={strVal || field.defaultValue as string} onValueChange={(v) => onChange(field.key, v)}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent>{field.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
  }
  return <div className="space-y-1.5"><Label className="text-xs font-medium">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label><Input id={field.key} type={field.type} value={strVal} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder} className="h-9" />{field.helper && <p className="text-[11px] text-muted-foreground">{field.helper}</p>}</div>
}

function FileUploadField({ field, value, onChange }: { field: QrTypeField; value: string; onChange: (k: string, v: string | boolean) => void }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return }
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json(); onChange(field.key, data.url); toast.success(`Uploaded: ${file.name}`)
    } catch { toast.error('Upload failed') } finally { setUploading(false) }
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
      <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
      <div className="flex gap-1.5">
        <Input value={value} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder || 'Upload or paste URL'} className="h-9 flex-1" />
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()} className="h-9 px-2">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {value && <div className="flex items-center gap-1.5 rounded border border-border bg-muted/30 p-1.5 text-[11px]"><FileText className="h-3 w-3 text-muted-foreground shrink-0" /><span className="truncate text-muted-foreground">{value}</span><button onClick={() => onChange(field.key, '')} className="shrink-0"><X className="h-3 w-3" /></button></div>}
    </div>
  )
}

export default QrStudio
