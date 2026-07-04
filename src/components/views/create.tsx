'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  ArrowRight, Search, Globe, Type, Wifi, FileText, Image as ImageIcon,
  Film, Contact, Mail, Phone, MessageSquare, MessageCircle, MapPin,
  Smartphone, Download, X, Sparkles, Check, QrCode as QrCodeIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { QrPreview } from '@/components/qr-preview'
import { useRouterStore } from '@/lib/stores'
import { QR_TYPES, QR_TYPE_MAP, QR_CATEGORIES, type QrTypeDef } from '@/lib/qr-types'
import { DEFAULT_DESIGN, type QrDesign } from '@/lib/types'
import { downloadQrPng, downloadQrSvg } from '@/lib/qr-generate'
import { cn } from '@/lib/utils'

// The 14 most popular types shown on the public page
const POPULAR_IDS = [
  'url', 'text', 'wifi', 'pdf', 'image', 'video',
  'vcard', 'email', 'phone', 'sms', 'whatsapp', 'googlemaps',
  'instagram', 'app-store',
]

const POPULAR_TYPES = POPULAR_IDS
  .map((id) => QR_TYPE_MAP[id])
  .filter(Boolean)

const STATS = [
  { value: '2.4M+', label: 'QR codes created' },
  { value: '180+', label: 'countries' },
  { value: '83+', label: 'QR types' },
  { value: '4.9/5', label: 'user rating' },
]

export function CreateView() {
  const navigate = useRouterStore((s) => s.navigate)
  const [allTypesOpen, setAllTypesOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<QrTypeDef | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({})
  const [downloading, setDownloading] = useState(false)
  const [search, setSearch] = useState('')

  const def = selectedType
  const payload = useMemo(() => def?.buildPayload(formValues) || '', [def, formValues])
  const design: QrDesign = { ...DEFAULT_DESIGN, dotStyle: 'rounded', eyeStyle: 'extra-rounded', errorCorrection: 'Q' }

  const handleSelectType = (type: QrTypeDef) => {
    setSelectedType(type)
    const vals: Record<string, string | boolean> = {}
    for (const f of type.fields) {
      vals[f.key] = f.defaultValue ?? (f.type === 'checkbox' ? false : '')
    }
    setFormValues(vals)
  }

  const handleDownload = async (kind: 'png' | 'svg') => {
    if (!payload) { toast.error('Fill in the required fields first'); return }
    setDownloading(true)
    try {
      const fn = `qr-${Date.now()}`
      if (kind === 'png') await downloadQrPng(payload, design, null, fn)
      else await downloadQrSvg(payload, design, null, fn)
      toast.success(`Downloaded ${kind.toUpperCase()}`)
    } catch { toast.error('Download failed') }
    finally { setDownloading(false) }
  }

  const handleFieldChange = (key: string, value: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const filteredAllTypes = useMemo(() => {
    if (!search) return QR_CATEGORIES.map((cat) => ({
      cat,
      types: QR_TYPES.filter((t) => t.category === cat.id),
    }))
    const q = search.toLowerCase()
    return QR_CATEGORIES.map((cat) => ({
      cat,
      types: QR_TYPES.filter((t) =>
        t.category === cat.id &&
        (t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      ),
    })).filter((group) => group.types.length > 0)
  }, [search])

  return (
    <div className="flex flex-col">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden border-b border-border hero-mesh">
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-muted/50 px-3.5 py-1.5 text-xs font-medium text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            Free · No watermark · No sign-up
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl md:text-6xl">
            Create QR codes in <span className="text-muted-foreground">seconds</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            83+ QR types, full customization, instant download. Free forever.
          </p>

          {/* Search */}
          <div className="mx-auto mt-8 max-w-md">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search QR types…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); if (!allTypesOpen) setAllTypesOpen(true) }}
                onFocus={() => setAllTypesOpen(true)}
                className="h-12 pl-10 text-base"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ POPULAR TYPES GRID ═══ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Popular QR Types</h2>
            <Button variant="outline" size="sm" onClick={() => setAllTypesOpen(true)}>
              View All ({QR_TYPES.length}+) <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {POPULAR_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectType(t)}
                className="group flex flex-col items-start gap-2.5 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                  <t.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold tracking-tight">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SEO CONTENT ═══ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h2 className="mb-4 text-xl font-bold tracking-tight">Free QR Code Generator</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              CreateAnQRCode is a free QR code generator that lets you create stunning, customized QR codes in seconds.
              Choose from 83+ QR types including URL, WiFi, vCard, UPI payment, PDF, image, and social media links.
              No sign-up required — generate, customize, and download instantly.
            </p>
            <p>
              Every QR code is free of watermarks. Download in PNG or SVG format.
              Customize colors, dot styles, eye shapes, gradients, and add your logo.
              Create dynamic QR codes to track scans and edit destinations anytime.
            </p>
            <p>
              Trusted by 2.4M+ creators across 180+ countries. 99.9% uptime. Free forever.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="inverted">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <Sparkles className="mx-auto h-8 w-8 opacity-80" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to create?
          </h2>
          <p className="mx-auto mt-3 max-w-md opacity-70">
            Pick a type above and start generating. No credit card, no watermark, no limits.
          </p>
          <Button
            size="lg"
            onClick={() => handleSelectType(POPULAR_TYPES[0])}
            className="mt-6 bg-current text-background hover:bg-current/90"
          >
            <QrCodeIcon className="h-4 w-4" />
            Create a QR Code
          </Button>
        </div>
      </section>

      {/* ═══ QR GENERATOR MODAL (opens when a type is selected) ═══ */}
      <Dialog open={!!selectedType} onOpenChange={(open) => { if (!open) setSelectedType(null) }}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {def && <def.icon className="h-5 w-5" />}
              {def?.label} QR Code
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 px-6 py-6">
            {/* Live preview */}
            <div className="flex justify-center">
              <div className="qr-frame p-4 shadow-sm">
                <QrPreview payload={payload || ' '} design={design} size={200} />
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {def?.fields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={f.key} className="text-sm font-medium">
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  {f.type === 'textarea' ? (
                    <textarea
                      id={f.key}
                      value={String(formValues[f.key] ?? '')}
                      onChange={(e) => handleFieldChange(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      rows={3}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  ) : f.type === 'select' ? (
                    <select
                      id={f.key}
                      value={String(formValues[f.key] ?? '')}
                      onChange={(e) => handleFieldChange(f.key, e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select…</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <Input
                      id={f.key}
                      type={f.type}
                      value={String(formValues[f.key] ?? '')}
                      onChange={(e) => handleFieldChange(f.key, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  )}
                  {f.helper && <p className="text-xs text-muted-foreground">{f.helper}</p>}
                </div>
              ))}
            </div>

            {/* Download */}
            <div className="flex gap-2 border-t border-border pt-4">
              <Button onClick={() => handleDownload('png')} disabled={downloading} variant="outline" className="flex-1">
                <Download className="h-4 w-4" /> PNG
              </Button>
              <Button onClick={() => handleDownload('svg')} disabled={downloading} variant="outline" className="flex-1">
                <Download className="h-4 w-4" /> SVG
              </Button>
            </div>

            {/* Sign up prompt */}
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Want scan analytics & dynamic links?{' '}
                <button onClick={() => navigate('signup')} className="font-medium text-brand hover:underline">
                  Create a free account →
                </button>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ ALL TYPES MODAL ═══ */}
      <Dialog open={allTypesOpen} onOpenChange={setAllTypesOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 z-10 border-b border-border bg-background px-6 py-4">
            <DialogTitle className="flex items-center justify-between">
              <span>All {QR_TYPES.length} QR Types</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAllTypesOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search QR types…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
                autoFocus
              />
            </div>
          </DialogHeader>

          <div className="space-y-6 px-6 py-4">
            {filteredAllTypes.map(({ cat, types }) => (
              <div key={cat.id}>
                <div className="mb-2 flex items-center gap-2">
                  <cat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat.label}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {types.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { handleSelectType(t); setAllTypesOpen(false) }}
                      className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-left transition-colors hover:border-foreground/20 hover:bg-muted/50"
                    >
                      <t.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-xs font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {filteredAllTypes.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No types match "{search}"</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CreateView
