'use client'

import { useQuery } from '@tanstack/react-query'
import { Users, QrCode, BarChart3, IndianRupee, TrendingUp, AlertTriangle, Ban, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'

interface Stats {
  users: { total: number; new24h: number; new7d: number; suspended: number }
  qrCodes: { total: number; dynamic: number; trashed: number }
  scans: { total: number; last24h: number; last7d: number }
  revenue: { totalPayments: number; revenue30dUSD: number }
  planDistribution: { plan: string; count: number }[]
}

export function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<Stats>('/api/admin/stats'),
  })

  if (isLoading || !data) return <div className="py-8 text-center text-sm text-muted-foreground">Loading platform stats…</div>

  const cards = [
    { label: 'Total Users', value: data.users.total.toLocaleString('en-IN'), sub: `+${data.users.new24h} today · +${data.users.new7d} this week`, icon: Users },
    { label: 'QR Codes', value: data.qrCodes.total.toLocaleString('en-IN'), sub: `${data.qrCodes.dynamic} dynamic · ${data.qrCodes.trashed} trashed`, icon: QrCode },
    { label: 'Total Scans', value: data.scans.total.toLocaleString('en-IN'), sub: `${data.scans.last24h.toLocaleString('en-IN')} today · ${data.scans.last7d.toLocaleString('en-IN')} this week`, icon: BarChart3 },
    { label: 'Revenue (30d)', value: `$${data.revenue.revenue30dUSD.toLocaleString('en-US')}`, sub: `${data.revenue.totalPayments} paid payments`, icon: IndianRupee },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Real-time KPIs across the entire platform.</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{c.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground/5 text-foreground">
                  <c.icon className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Plan distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.planDistribution.map((p) => {
              const pct = data.users.total ? Math.round((p.count / data.users.total) * 100) : 0
              return (
                <div key={p.plan}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{p.plan}</span>
                    <span className="text-muted-foreground">{p.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" /> Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.users.suspended > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <Ban className="h-4 w-4 text-destructive" />
                <span>{data.users.suspended} suspended user{data.users.suspended === 1 ? '' : 's'}</span>
              </div>
            )}
            {data.qrCodes.trashed > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <QrCode className="h-4 w-4 text-muted-foreground" />
                <span>{data.qrCodes.trashed} trashed QR codes</span>
              </div>
            )}
            {data.users.suspended === 0 && data.qrCodes.trashed === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>All clear — no alerts.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
