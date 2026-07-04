'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  QrCode as QrCodeIcon, Plus, Globe, Wifi, IndianRupee, Contact,
  MessageCircle, ArrowRight, Lock, Download, Eye,
  LayoutGrid, TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QrPreview } from '@/components/qr-preview'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { QR_TYPE_MAP } from '@/lib/qr-types'
import { PLAN_LIMITS, type QrCodeRecord } from '@/lib/types'
import { formatDate, formatNumber, timeAgo } from '@/lib/format'
// NOTE: The QR Studio component + its field renderers now live in
// src/components/qr-studio.tsx and are rendered globally by DashboardShell.
// This view only triggers it via useUIStore.openStudio().

const QUICK_CREATE: { typeId: 'url' | 'wifi' | 'upi' | 'vcard' | 'whatsapp'; label: string; icon: typeof Globe }[] = [
  { typeId: 'url', label: 'URL', icon: Globe },
  { typeId: 'wifi', label: 'WiFi', icon: Wifi },
  { typeId: 'upi', label: 'UPI', icon: IndianRupee },
  { typeId: 'vcard', label: 'vCard', icon: Contact },
  { typeId: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
]

export function DashboardView() {
  const navigate = useRouterStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  const query = useQRQuery()
  const codes = query?.data?.data ?? []
  const isLoading = !query?.data

  const total = codes.length
  const staticCount = codes.filter((c) => !c.isDynamic).length
  const dynamicCount = codes.filter((c) => c.isDynamic).length
  const totalDownloads = codes.reduce((s, c) => s + (c.downloadCount || 0), 0)
  const totalScans = codes.reduce((s, c) => s + (c.scanCount || 0), 0)

  const plan = user?.plan ?? 'free'
  const dynamicLimit = PLAN_LIMITS[plan].dynamicQr
  const recent = codes.slice(0, 6)

  const stats = [
    { label: 'Total QR Codes', value: formatNumber(total), icon: LayoutGrid },
    { label: 'Static', value: formatNumber(staticCount), icon: QrCodeIcon },
    { label: 'Dynamic', value: dynamicLimit ? `${formatNumber(dynamicCount)}/${dynamicLimit}` : `${formatNumber(dynamicCount)}/∞`, icon: TrendingUp, accent: true },
    { label: 'Downloads', value: formatNumber(totalDownloads), icon: Download },
    { label: 'Scans', value: plan === 'free' ? '—' : formatNumber(totalScans), icon: Eye, locked: plan === 'free' },
  ]

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your QR codes today.</p>
        </div>
        <Button onClick={() => navigate('studio')} className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="mr-2 h-4 w-4" /> Create QR Code
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-xl border border-border animate-pulse" />)
        ) : stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="group card-hover border-border">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="mt-1 text-2xl font-bold">{s.value}</p></div>
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick create */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick create</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_CREATE.map((q) => (
            <button key={q.typeId} onClick={() => navigate('studio', { type: q.typeId })}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-all hover:border-foreground/30">
              <q.icon className="h-4 w-4" />{q.label}
              <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent QR Codes</h2>
          {total > 0 && <Button variant="ghost" size="sm" onClick={() => navigate('qr-codes')} className="text-brand">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>}
        </div>
        {isLoading ? <div className="h-32 animate-pulse rounded-xl border border-border" /> : recent.length === 0 ? (
          <Card className="border-dashed border-border">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-muted text-brand"><QrCodeIcon className="h-8 w-8" /></div>
              <div><h3 className="text-lg font-semibold">No QR codes yet</h3><p className="mt-1 text-sm text-muted-foreground">Create your first QR code in seconds.</p></div>
              <Button onClick={() => navigate('studio')} className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />Create your first QR code</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((c) => <RecentCard key={c.id} code={c} onClick={() => navigate('qr-detail', { id: c.id })} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function RecentCard({ code, onClick }: { code: QrCodeRecord; onClick: () => void }) {
  const typeDef = QR_TYPE_MAP[code.qrType]
  const Icon = typeDef?.icon ?? QrCodeIcon
  return (
    <Card onClick={onClick} className="group cursor-pointer border-border transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-card p-2 shadow-sm ring-1 ring-border"><QrPreview payload={code.staticPayload || code.destinationUrl || ''} design={code.design} logoDataUrl={code.logoDataUrl} size={88} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5"><Badge variant="secondary" className="gap-1 text-[10px]"><Icon className="h-2.5 w-2.5" />{typeDef?.label ?? code.qrType}</Badge>{code.isDynamic && <Badge variant="outline" className="text-[10px]">Dynamic</Badge>}</div>
            <h3 className="mt-1.5 truncate font-semibold">{code.title}</h3>
            <p className="text-xs text-muted-foreground">{formatDate(code.createdAt)}</p>
            <div className="mt-2 flex items-center gap-3 text-xs">
              {!code.isDynamic ? <span className="flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" />Static</span> : <span className="flex items-center gap-1 text-foreground"><Eye className="h-3 w-3" />{formatNumber(code.scanCount)} scans</span>}
              <span className="flex items-center gap-1 text-muted-foreground"><Download className="h-3 w-3" />{formatNumber(code.downloadCount)}</span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Updated {timeAgo(code.updatedAt)}</p>
      </CardContent>
    </Card>
  )
}

// Helper hook
function useQRQuery() {
  const qc = useQueryClient()
  return { data: qc.getQueryData<{ data: QrCodeRecord[] }>(['qr-codes']) }
}

export default DashboardView
