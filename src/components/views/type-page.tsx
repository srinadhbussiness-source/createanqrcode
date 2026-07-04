'use client'

import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import {
  ChevronDown, Download, Save, Sparkles, AlertCircle, Lock,
  CalendarClock, Hash, Image as ImageIcon, X, SlidersHorizontal,
  FileEdit, ChevronRight, Home, LayoutGrid,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { QrPreview } from '@/components/qr-preview'
import { useRouterStore, useUIStore, useAuthStore } from '@/lib/stores'
import { QR_TYPE_MAP, QR_TYPES, QR_CATEGORIES, getSeo, type QrTypeField } from '@/lib/qr-types'
import { DEFAULT_DESIGN, PLAN_LIMITS, type QrDesign } from '@/lib/types'
import { api, ApiError } from '@/lib/api'
import { downloadQrPng, downloadQrSvg, downloadQrPdf, downloadQrEps } from '@/lib/qr-generate'
import { cn } from '@/lib/utils'

const DOT_STYLES: { id: QrDesign['dotStyle']; label: string }[] = [
  { id: 'square', label: 'Square' }, { id: 'rounded', label: 'Rounded' }, { id: 'dots', label: 'Dots' },
  { id: 'classy', label: 'Classy' }, { id: 'classy-rounded', label: 'Classy Rnd' }, { id: 'extra-rounded', label: 'Extra Rnd' },
]
const EYE_STYLES: { id: QrDesign['eyeStyle']; label: string }[] = [
  { id: 'square', label: 'Square' }, { id: 'extra-rounded', label: 'Rounded' }, { id: 'dot', label: 'Dot' },
]
const EC_LEVELS: { id: QrDesign['errorCorrection']; label: string; helper: string }[] = [
  { id: 'L', label: 'L', helper: '~7% recovery · most data' },
  { id: 'M', label: 'M', helper: '~15% recovery · recommended' },
  { id: 'Q', label: 'Q', helper: '~25% recovery · logos' },
  { id: 'H', label: 'H', helper: '~30% recovery · damaged' },
]
const OUTPUT_SIZES: QrDesign['outputSize'][] = [256, 512, 1024, 2048]
const COLOR_PRESETS = ['#000000', '#7C3AED', '#EC4899', '#DC2626', '#EA580C', '#16A34A', '#0891B2', '#1E40AF']
const BG_PRESETS = ['#FFFFFF', '#F8FAFC', '#FEF3C7', '#E0E7FF', '#FCE7F3', '#000000']

// Desktop detection at lg breakpoint (matches the Create view)
const DESKTOP_QUERY = '(min-width: 1024px)'
function subscribeDesktop(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia(DESKTOP_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
function getDesktop() { return typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches }
function getDesktopServer() { return false }
function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, getDesktop, getDesktopServer)
}

function initialFormValues(typeId: string): Record<string, string | boolean> {
  const def = QR_TYPE_MAP[typeId]
  if (!def) return {}
  const vals: Record<string, string | boolean> = {}
  for (const f of def.fields) vals[f.key] = f.defaultValue ?? (f.type === 'checkbox' ? false : '')
  return vals
}

export function TypePageView() {
  const navigate = useRouterStore((s) => s.navigate)
  const params = useRouterStore((s) => s.params)
  const user = useAuthStore((s) => s.user)

  const typeId = params.type && QR_TYPE_MAP[params.type] ? params.type : 'url'
  const def = QR_TYPE_MAP[typeId]
  const seo = useMemo(() => getSeo(typeId), [typeId])

  // ── SEO: dynamically update document title + meta ──
  // Re-applies on auth state change too (`user`), because the auth re-render can
  // trigger Next.js to re-assert the static layout metadata and clobber our
  // per-type head tags. A delayed re-assert wins that race.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const apply = () => {
      document.title = seo.title
      const setMeta = (name: string, content: string) => {
        let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
        if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el) }
        el.setAttribute('content', content)
      }
      setMeta('description', seo.description)
      setMeta('keywords', seo.keywords.join(', '))
    }
    apply()
    // Re-assert after the next paint + a microtask delay to out-last any
    // framework metadata re-application triggered by concurrent re-renders.
    const raf = requestAnimationFrame(apply)
    const t = setTimeout(apply, 60)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [seo, typeId, user])

  // Restore the default document title when leaving a type page.
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.title = 'CreateAnQRCode — Free QR Code Generator. Forever.'
      }
    }
  }, [])

  const [formValues, setFormValues] = useState<Record<string, string | boolean>>(() => initialFormValues(typeId))
  const [title, setTitle] = useState(`${def.label} QR Code`)
  const [design, setDesign] = useState<QrDesign>({ ...DEFAULT_DESIGN })
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [isDynamic, setIsDynamic] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mobileTab, setMobileTab] = useState<'content' | 'design'>('content')

  // Reset state when the type changes
  useEffect(() => {
    setFormValues(initialFormValues(typeId))
    setTitle(`${def.label} QR Code`)
    setMobileTab('content')
  }, [typeId, def.label])

  const payload = useMemo(() => def.buildPayload(formValues), [def, formValues])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDesktop = useIsDesktop()

  const updateDesign = (patch: Partial<QrDesign>) => setDesign((d) => ({ ...d, ...patch }))

  const validate = (): string | null => {
    for (const f of def.fields) {
      if (f.required && f.showIf && !f.showIf(formValues)) continue
      if (f.required && f.type !== 'checkbox') {
        const val = formValues[f.key]
        if (!val || (typeof val === 'string' && !val.trim())) return `"${f.label}" is required`
      }
    }
    if (!payload) return 'Please fill in the required fields'
    return null
  }

  const handleDownload = async (kind: 'png' | 'svg' | 'pdf' | 'eps') => {
    const err = validate()
    if (err) { toast.error(err); setMobileTab('content'); return }
    if (!payload) return
    setDownloading(true)
    try {
      const fn = (title || 'qr-code').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
      if (kind === 'png') await downloadQrPng(payload, design, logoDataUrl, fn)
      else if (kind === 'svg') await downloadQrSvg(payload, design, logoDataUrl, fn)
      else if (kind === 'pdf') await downloadQrPdf(payload, design, logoDataUrl, fn, title || undefined)
      else await downloadQrEps(payload, design, logoDataUrl, fn)
      toast.success(`Downloaded ${kind.toUpperCase()}`)
    } catch { toast.error('Download failed') } finally { setDownloading(false) }
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { toast.error(err); return }
    if (!payload) return
    if (!user) { navigate('signup', { redirect: 'type-page' }); return }
    setSaving(true)
    try {
      await api.post('/api/qr-codes', {
        title: title.trim(),
        qrType: typeId,
        isDynamic,
        // For dynamic codes the payload becomes the destination URL so scans
        // can be tracked + the destination can be edited later.
        staticPayload: isDynamic ? null : payload,
        destinationUrl: isDynamic ? payload : null,
        password: null,
        expiresAt: null,
        maxScans: null,
        design, logoDataUrl, tags: [],
      })
      toast.success(isDynamic ? 'Dynamic QR code saved!' : 'QR code saved!')
      navigate('qr-codes')
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

  const relatedTypes = useMemo(() => {
    return QR_CATEGORIES.find((c) => c.id === def.category)
      ? Object.values(QR_TYPE_MAP).filter((t) => t.category === def.category && t.id !== typeId).slice(0, 6)
      : []
  }, [def.category, typeId])

  const cat = QR_CATEGORIES.find((c) => c.id === def.category)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <button onClick={() => navigate('home')} className="inline-flex items-center gap-1 hover:text-foreground"><Home className="h-3 w-3" /> Home</button>
        <ChevronRight className="h-3 w-3" />
        <button onClick={() => navigate('types')} className="inline-flex items-center gap-1 hover:text-foreground"><LayoutGrid className="h-3 w-3" /> All QR Types</button>
        {cat && <>
          <ChevronRight className="h-3 w-3" />
          <span>{cat.label}</span>
        </>}
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{def.label}</span>
      </nav>

      {/* SEO H1 + intro */}
      <header className="mb-6 max-w-3xl">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-muted text-brand">
            <def.icon className="h-6 w-6" />
          </div>
          <Badge variant="outline" className="border-brand/30 text-brand">{cat?.label}</Badge>
          {def.popular && <Badge variant="secondary">Popular</Badge>}
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{def.label} QR Code Generator</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">{seo.description}</p>
      </header>

      {/* ── GENERATOR ── */}
      <div className="mb-12">
        {isDesktop ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* LEFT — form + customizer (below form, collapsed by default) */}
            <div className="space-y-6">
              <FormCard def={def} title={title} setTitle={setTitle} formValues={formValues}
                onFieldChange={(k, val) => setFormValues((p) => ({ ...p, [k]: val }))}
                user={user} navigate={navigate}
                isDynamic={isDynamic} setIsDynamic={setIsDynamic} dynamicLimit={PLAN_LIMITS[user?.plan ?? 'free'].dynamicQr} />
              <Customizer design={design} updateDesign={updateDesign} logoDataUrl={logoDataUrl}
                onLogoUpload={handleLogoUpload} onLogoRemove={() => setLogoDataUrl(null)} fileInputRef={fileInputRef}
                user={user} navigate={navigate} />
            </div>
            {/* RIGHT — live preview (sticky, always visible) */}
            <div className="lg:sticky lg:top-20 lg:self-start lg:z-10">
              <PreviewCard payload={payload} design={design} logoDataUrl={logoDataUrl}
                onDownload={handleDownload} downloading={downloading} onSave={handleSave} saving={saving} user={user} navigate={navigate} isDynamic={isDynamic} />
            </div>
          </div>
        ) : (
          <div>
            <div className="sticky top-16 z-20 -mx-4 mb-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="qr-frame shrink-0 rounded-xl p-1.5 shadow-sm">
                  <QrPreview payload={payload || ' '} design={design} logoDataUrl={logoDataUrl} size={72} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{title}</p>
                  <p className="truncate text-xs text-muted-foreground">{def.label} · {design.dotStyle}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleDownload('png')} disabled={downloading}><Download className="h-3 w-3" /> PNG</Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleDownload('svg')} disabled={downloading}><Download className="h-3 w-3" /> SVG</Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleDownload('pdf')} disabled={downloading}><Download className="h-3 w-3" /> PDF</Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleDownload('eps')} disabled={downloading}><Download className="h-3 w-3" /> EPS</Button>
                  </div>
                </div>
              </div>
            </div>
            <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as 'content' | 'design')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content" className="gap-1.5"><FileEdit className="h-3.5 w-3.5" /> Content</TabsTrigger>
                <TabsTrigger value="design" className="gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" /> Design</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="mt-4 pb-24">
                <FormCard def={def} title={title} setTitle={setTitle} formValues={formValues}
                  onFieldChange={(k, val) => setFormValues((p) => ({ ...p, [k]: val }))}
                  user={user} navigate={navigate}
                  isDynamic={isDynamic} setIsDynamic={setIsDynamic} dynamicLimit={PLAN_LIMITS[user?.plan ?? 'free'].dynamicQr} />
              </TabsContent>
              <TabsContent value="design" className="mt-4 pb-24">
                <Customizer design={design} updateDesign={updateDesign} logoDataUrl={logoDataUrl}
                  onLogoUpload={handleLogoUpload} onLogoRemove={() => setLogoDataUrl(null)} fileInputRef={fileInputRef}
                  user={user} navigate={navigate} />
              </TabsContent>
            </Tabs>
            <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md pb-safe">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleDownload('png')} disabled={downloading} variant="outline" className="flex-1"><Download className="h-4 w-4" /> PNG</Button>
                <Button onClick={() => handleDownload('svg')} disabled={downloading} variant="outline" className="flex-1"><Download className="h-4 w-4" /> SVG</Button>
                <Button onClick={() => handleDownload('pdf')} disabled={downloading} variant="outline" className="flex-1"><Download className="h-4 w-4" /> PDF</Button>
                <Button onClick={() => handleDownload('eps')} disabled={downloading} variant="outline" className="flex-1"><Download className="h-4 w-4" /> EPS</Button>
                {user ? (
                  <Button onClick={handleSave} disabled={saving} className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90"><Save className="h-4 w-4" /> {saving ? '...' : 'Save'}</Button>
                ) : (
                  <Button onClick={() => navigate('signup')} className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90">Sign up</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SEO CONTENT: How to + FAQ + Related ── */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* How to */}
        <section className="lg:col-span-2">
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold">How to create a {def.label} QR code</h2>
              <ol className="mt-4 space-y-3">
                {seo.howTo.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-brand-foreground">{i + 1}</span>
                    <span className="text-sm text-foreground/90">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 rounded-xl bg-muted/50 p-4 text-sm">
                <p className="font-medium text-foreground">Use cases</p>
                <p className="mt-1 text-muted-foreground">{def.useCase}</p>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card className="mt-6 rounded-2xl">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold">{def.label} QR code FAQ</h2>
              <Accordion type="single" collapsible className="mt-4">
                {seo.faqs.map((f, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        {/* Related types */}
        <aside>
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <h2 className="text-base font-bold">Related QR types</h2>
              <p className="mt-1 text-xs text-muted-foreground">More in {cat?.label}</p>
              <div className="mt-4 space-y-1">
                {relatedTypes.map((t) => (
                  <button key={t.id} onClick={() => navigate('type-page', { type: t.id })}
                    className="tap-none flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent">
                    <t.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{t.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
              <Button variant="outline" className="mt-4 w-full" onClick={() => navigate('types')}>
                <LayoutGrid className="h-4 w-4" /> Browse all {QR_TYPES.length} types
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function FormCard({ def, title, setTitle, formValues, onFieldChange, user, navigate, isDynamic, setIsDynamic, dynamicLimit }: {
  def: typeof QR_TYPE_MAP[string]
  title: string
  setTitle: (v: string) => void
  formValues: Record<string, string | boolean>
  onFieldChange: (k: string, v: string | boolean) => void
  user: ReturnType<typeof useAuthStore.getState>['user']
  navigate: (v: Parameters<ReturnType<typeof useRouterStore.getState>['navigate']>[0]) => void
  isDynamic: boolean
  setIsDynamic: (v: boolean) => void
  dynamicLimit: number | null
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="qr-title">Title <span className="text-destructive">*</span></Label>
          <Input id="qr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My QR Code" />
        </div>
        <Separator />
        {/* Dynamic QR toggle — enables scan tracking, analytics, editable
            destination, password protection, expiry & redirect rules. */}
        <div className={cn(
          'rounded-xl border p-4 transition-colors',
          isDynamic ? 'border-brand/40 bg-brand-muted/30' : 'border-border bg-muted/30'
        )}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand" />
                <p className="text-sm font-semibold">Dynamic QR Code</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {isDynamic
                  ? 'Track scans, edit the destination later, add password protection, expiry & redirect rules.'
                  : 'Enable for scan tracking, analytics & editable destination.'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Plan limit: {dynamicLimit === null ? 'unlimited' : dynamicLimit} dynamic codes
              </p>
            </div>
            <Switch checked={isDynamic} onCheckedChange={setIsDynamic} aria-label="Toggle dynamic QR" />
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          {def.fields.map((f) => <FieldRenderer key={f.key} field={f} values={formValues} onChange={onFieldChange} />)}
        </div>
        {!user && (
          <div className="rounded-xl border border-brand/30 bg-brand-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div className="flex-1">
                <p className="text-sm font-medium">Save and track this QR code — Free account</p>
                <p className="mt-1 text-xs text-muted-foreground">Create an account to enable dynamic links, scan analytics and team sharing.</p>
                <Button size="sm" className="mt-3 bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate('signup')}>Sign up free →</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PreviewCard({ payload, design, logoDataUrl, onDownload, downloading, onSave, saving, user, navigate, isDynamic }: {
  payload: string
  design: QrDesign
  logoDataUrl: string | null
  onDownload: (k: 'png' | 'svg' | 'pdf' | 'eps') => void
  downloading: boolean
  onSave: () => void
  saving: boolean
  user: ReturnType<typeof useAuthStore.getState>['user']
  navigate: (v: Parameters<ReturnType<typeof useRouterStore.getState>['navigate']>[0]) => void
  isDynamic: boolean
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-4 p-6">
        <div className="flex justify-center">
          <div className="qr-frame p-4 shadow-sm"><QrPreview payload={payload || ' '} design={design} logoDataUrl={logoDataUrl} size={240} /></div>
        </div>
        {isDynamic && (
          <div className="rounded-lg border border-brand/30 bg-brand-muted/20 px-3 py-2 text-center text-[11px] font-medium text-brand">
            <Sparkles className="mr-1 inline h-3 w-3" /> Dynamic — scans tracked
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onDownload('png')} disabled={downloading} variant="outline" className="flex-1"><Download className="h-4 w-4" /> PNG</Button>
          <Button onClick={() => onDownload('svg')} disabled={downloading} variant="outline" className="flex-1"><Download className="h-4 w-4" /> SVG</Button>
          <Button onClick={() => onDownload('pdf')} disabled={downloading} variant="outline" className="flex-1"><Download className="h-4 w-4" /> PDF</Button>
          <Button onClick={() => onDownload('eps')} disabled={downloading} variant="outline" className="flex-1"><Download className="h-4 w-4" /> EPS</Button>
        </div>
        {user ? (
          <Button onClick={onSave} disabled={saving} className="w-full bg-brand text-brand-foreground hover:bg-brand/90"><Save className="h-4 w-4" /> {saving ? 'Saving...' : isDynamic ? 'Save Dynamic QR' : 'Save to library'}</Button>
        ) : (
          <Button onClick={() => navigate('signup')} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">Sign up to save & track</Button>
        )}
      </CardContent>
    </Card>
  )
}

function FieldRenderer({ field, values, onChange }: { field: QrTypeField; values: Record<string, string | boolean>; onChange: (k: string, v: string | boolean) => void }) {
  if (field.showIf && !field.showIf(values)) return null
  const value = values[field.key]
  const strVal = typeof value === 'boolean' ? '' : value
  const label = (
    <Label htmlFor={field.key} className="text-sm font-medium">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
  )
  if (field.type === 'checkbox') {
    return (
      <div className="flex items-center gap-2.5">
        <Checkbox id={field.key} checked={!!value} onCheckedChange={(c) => onChange(field.key, c === true)} />
        <Label htmlFor={field.key} className="text-sm font-medium">{field.label}</Label>
      </div>
    )
  }
  if (field.type === 'textarea') {
    return (
      <div className="space-y-2">
        {label}
        <Textarea id={field.key} value={strVal} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder} />
        {field.helper && <p className="text-xs text-muted-foreground">{field.helper}</p>}
      </div>
    )
  }
  if (field.type === 'select') {
    return (
      <div className="space-y-2">
        {label}
        <Select value={strVal || field.defaultValue as string} onValueChange={(val) => onChange(field.key, val)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>{field.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        {field.helper && <p className="text-xs text-muted-foreground">{field.helper}</p>}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {label}
      <Input id={field.key} type={field.type} value={strVal} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder} />
      {field.helper && <p className="text-xs text-muted-foreground">{field.helper}</p>}
    </div>
  )
}

function Customizer({ design, updateDesign, logoDataUrl, onLogoUpload, onLogoRemove, fileInputRef, user, navigate }: {
  design: QrDesign
  updateDesign: (patch: Partial<QrDesign>) => void
  logoDataUrl: string | null
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onLogoRemove: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  user: ReturnType<typeof useAuthStore.getState>['user']
  navigate: (v: Parameters<ReturnType<typeof useRouterStore.getState>['navigate']>[0]) => void
}) {
  const isAuthed = !!user
  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-1 p-6">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-base font-semibold">Customize</h2>
          {!isAuthed && (
            <Badge variant="outline" className="gap-1 border-brand/30 text-brand text-[10px]">
              <Sparkles className="h-2.5 w-2.5" /> More in dashboard
            </Badge>
          )}
        </div>
        <CustomSection title="Colors">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Foreground color</p>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button key={c} onClick={() => updateDesign({ fgColor: c })} aria-label={c}
                    className={cn('h-7 w-7 rounded-full border-2 tap-none', design.fgColor === c ? 'border-brand ring-2 ring-brand/30' : 'border-border')}
                    style={{ backgroundColor: c }} />
                ))}
                <input type="color" value={design.fgColor} onChange={(e) => updateDesign({ fgColor: e.target.value })} className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0" />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Background color</p>
              <div className="flex flex-wrap items-center gap-2">
                {BG_PRESETS.map((c) => (
                  <button key={c} onClick={() => updateDesign({ bgColor: c, transparentBg: false })} aria-label={c}
                    className={cn('h-7 w-7 rounded-full border-2 tap-none', design.bgColor === c && !design.transparentBg ? 'border-brand ring-2 ring-brand/30' : 'border-border')}
                    style={{ backgroundColor: c }} />
                ))}
                <input type="color" value={design.bgColor} onChange={(e) => updateDesign({ bgColor: e.target.value, transparentBg: false })} className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="tp-bg" checked={design.transparentBg} onCheckedChange={(c) => updateDesign({ transparentBg: c === true })} />
              <Label htmlFor="tp-bg" className="text-xs font-medium">Transparent background</Label>
            </div>
          </div>
        </CustomSection>
        <CustomSection title="Dot Style">
          <div className="grid grid-cols-3 gap-2">
            {DOT_STYLES.map((s) => (
              <button key={s.id} onClick={() => updateDesign({ dotStyle: s.id })}
                className={cn('rounded-lg border px-2 py-2.5 text-xs font-medium tap-none', design.dotStyle === s.id ? 'border-brand bg-brand-muted text-brand' : 'border-border hover:border-brand/40')}>{s.label}</button>
            ))}
          </div>
        </CustomSection>
        <CustomSection title="Eye Style">
          <div className="grid grid-cols-3 gap-2">
            {EYE_STYLES.map((s) => (
              <button key={s.id} onClick={() => updateDesign({ eyeStyle: s.id })}
                className={cn('rounded-lg border px-2 py-2.5 text-xs font-medium tap-none', design.eyeStyle === s.id ? 'border-brand bg-brand-muted text-brand' : 'border-border hover:border-brand/40')}>{s.label}</button>
            ))}
          </div>
        </CustomSection>
        <CustomSection title="Error Correction">
          <div className="grid grid-cols-4 gap-2">
            {EC_LEVELS.map((e) => (
              <button key={e.id} onClick={() => updateDesign({ errorCorrection: e.id })}
                className={cn('rounded-lg border px-2 py-2.5 text-xs font-bold tap-none', design.errorCorrection === e.id ? 'border-brand bg-brand-muted text-brand' : 'border-border hover:border-brand/40')}>{e.label}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{EC_LEVELS.find((e) => e.id === design.errorCorrection)?.helper}</p>
        </CustomSection>
        <CustomSection title="Output Size">
          <div className="grid grid-cols-4 gap-2">
            {OUTPUT_SIZES.map((s) => (
              <button key={s} onClick={() => updateDesign({ outputSize: s })}
                className={cn('rounded-lg border px-2 py-2.5 text-xs font-medium tap-none', design.outputSize === s ? 'border-brand bg-brand-muted text-brand' : 'border-border hover:border-brand/40')}>{s}</button>
            ))}
          </div>
        </CustomSection>
        {/* ── ADVANCED: Gradient (dashboard-only — locked for anonymous users) ── */}
        {isAuthed ? (
        <CustomSection title="Gradient">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(['none', 'linear', 'radial'] as const).map((g) => (
                <button key={g} onClick={() => updateDesign({ gradientType: g })}
                  className={cn('rounded-lg border px-2 py-2.5 text-xs font-medium capitalize tap-none', design.gradientType === g ? 'border-brand bg-brand-muted text-brand' : 'border-border hover:border-brand/40')}>{g}</button>
              ))}
            </div>
            {design.gradientType !== 'none' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="mb-1 text-xs text-muted-foreground">Start</p><input type="color" value={design.gradientStart} onChange={(e) => updateDesign({ gradientStart: e.target.value })} className="h-8 w-full cursor-pointer rounded border border-border bg-transparent p-0" /></div>
                  <div><p className="mb-1 text-xs text-muted-foreground">End</p><input type="color" value={design.gradientEnd} onChange={(e) => updateDesign({ gradientEnd: e.target.value })} className="h-8 w-full cursor-pointer rounded border border-border bg-transparent p-0" /></div>
                </div>
                {design.gradientType === 'linear' && (
                  <div><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Angle</span><span className="font-mono">{design.gradientAngle}°</span></div><Slider value={[design.gradientAngle]} min={0} max={360} onValueChange={(val) => updateDesign({ gradientAngle: val[0] })} /></div>
                )}
              </div>
            )}
          </div>
        </CustomSection>
        ) : <LockedSection title="Gradient" description="Gradient fills with custom colors & angles." navigate={navigate} />}

        {/* ── ADVANCED: Logo (dashboard-only — locked for anonymous users) ── */}
        {isAuthed ? (
        <CustomSection title="Logo">
          <div className="space-y-3">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />
            {logoDataUrl ? (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <img src={logoDataUrl} alt="Logo" className="h-12 w-12 rounded object-contain" />
                <div className="flex-1 text-xs text-muted-foreground">Logo uploaded</div>
                <Button size="icon" variant="ghost" onClick={onLogoRemove}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border p-5 text-xs text-muted-foreground hover:border-brand/40 hover:text-brand tap-none">
                <ImageIcon className="h-6 w-6" /> Click to upload logo (PNG/SVG, ≤1MB)
              </button>
            )}
            <div><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Logo size</span><span className="font-mono">{design.logoSize}%</span></div><Slider value={[design.logoSize]} min={10} max={40} onValueChange={(val) => updateDesign({ logoSize: val[0] })} /></div>
            <div><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Logo padding</span><span className="font-mono">{design.logoPadding}px</span></div><Slider value={[design.logoPadding]} min={0} max={20} onValueChange={(val) => updateDesign({ logoPadding: val[0] })} /></div>
          </div>
        </CustomSection>
        ) : <LockedSection title="Logo" description="Upload your brand logo with size & padding controls." navigate={navigate} />}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground"><AlertCircle className="h-3.5 w-3.5" /> Tip</div>
          Use error correction <strong>Q</strong> or <strong>H</strong> when adding a logo so the QR stays scannable.
        </div>
      </CardContent>
    </Card>
  )
}

function CustomSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2.5 text-sm font-medium hover:underline tap-none">
        {title}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3">{children}</CollapsibleContent>
      <Separator />
    </Collapsible>
  )
}

/** A locked customization section shown to anonymous (not-logged-in) users.
 *  Displays a lock icon + description + "Sign up to unlock" CTA that navigates
 *  to the signup page. The actual controls are only rendered in the dashboard
 *  Studio (qr-studio.tsx). */
function LockedSection({ title, description, navigate }: {
  title: string
  description: string
  navigate: (v: Parameters<ReturnType<typeof useRouterStore.getState>['navigate']>[0]) => void
}) {
  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <Badge variant="outline" className="gap-1 border-brand/30 text-brand text-[10px]">
          <Lock className="h-2.5 w-2.5" /> Pro
        </Badge>
      </div>
      <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-muted text-brand">
            <Lock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">{description}</p>
            <button
              onClick={() => navigate('signup')}
              className="mt-1 text-xs font-medium text-brand hover:underline"
            >
              Sign up free to unlock →
            </button>
          </div>
        </div>
      </div>
      <Separator className="mt-2.5" />
    </div>
  )
}

export default TypePageView
