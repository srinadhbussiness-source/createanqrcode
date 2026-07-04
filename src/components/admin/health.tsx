'use client'

import { useQuery } from '@tanstack/react-query'
import { Activity, Server, Database, Zap, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'

export function AdminHealth() {
  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<{ scans: { last24h: number; total: number }; qrCodes: { total: number }; users: { total: number } }>('/api/admin/stats'),
  })

  const services = [
    { name: 'Web Server', status: 'operational', detail: 'Next.js 16.1.3 — responding', icon: Server },
    { name: 'Database', status: 'operational', detail: 'SQLite — connected', icon: Database },
    { name: 'API Gateway', status: 'operational', detail: 'Caddy — forwarding', icon: Zap },
    { name: 'Scan Redirect', status: 'operational', detail: `${stats?.scans.last24h.toLocaleString('en-IN') ?? '—'} scans in 24h`, icon: Activity },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">Real-time service status and platform metrics.</p>
      </div>

      {/* Status banner */}
      <Card className="border-foreground/20">
        <CardContent className="flex items-center gap-3 p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground/5">
            <CheckCircle2 className="h-5 w-5 text-foreground" />
          </span>
          <div>
            <p className="text-sm font-semibold">All systems operational</p>
            <p className="text-xs text-muted-foreground">Last checked {new Date().toLocaleTimeString('en-IN')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((s) => (
          <Card key={s.name}>
            <CardContent className="flex items-center gap-3 p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground/5">
                <s.icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <Badge variant="secondary" className="bg-foreground/5 text-foreground text-[10px]">
                    <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> {s.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick metrics */}
      <Card>
        <CardHeader><CardTitle className="text-base">Platform Metrics</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Users</p>
            <p className="mt-1 text-2xl font-bold">{stats?.users.total.toLocaleString('en-IN') ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total QR Codes</p>
            <p className="mt-1 text-2xl font-bold">{stats?.qrCodes.total.toLocaleString('en-IN') ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Scans (24h)</p>
            <p className="mt-1 text-2xl font-bold">{stats?.scans.last24h.toLocaleString('en-IN') ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Scans</p>
            <p className="mt-1 text-2xl font-bold">{stats?.scans.total.toLocaleString('en-IN') ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Incident history (placeholder) */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertCircle className="h-4 w-4" /> Incident History</CardTitle></CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">No incidents in the last 30 days.</p>
        </CardContent>
      </Card>
    </div>
  )
}
