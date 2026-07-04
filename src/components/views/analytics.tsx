'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  BarChart3, Users, Globe, Clock, Download, Lock, ArrowRight,
  Smartphone, Monitor, Activity, Crown, ChevronRight, GitCompare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { api } from '@/lib/api'
import { PLAN_LIMITS, type Plan, type QrCodeRecord } from '@/lib/types'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getSupabaseClient } from '@/lib/supabase-client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  type AnalyticsSummary, type RangeKey,
  RANGE_OPTIONS,
  DEVICE_COLOR, UNIQUE_COLOR,
  StatCard, DonutCard, Heatmap, EmptyChart,
  ScansOverTimeChart, TopCountriesChart, TopReferrersList, RecentScansFeed,
} from '@/components/analytics-blocks'

export function AnalyticsView() {
  const navigate = useRouterStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const plan = (user?.plan ?? 'free') as Plan
  const limits = PLAN_LIMITS[plan]

  const [range, setRange] = useState<RangeKey>(
    limits.analyticsDays && limits.analyticsDays >= 30 ? '30' : '7'
  )
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [mode, setMode] = useState<'single' | 'compare'>('single')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', range],
    queryFn: () => api.get<AnalyticsSummary>('/api/analytics/summary?range=' + range),
    enabled: plan !== 'free' && mode === 'single',
    // Real-time: refetch every 15s as a fallback alongside Supabase Realtime.
    // The Supabase subscription (below) pushes instant updates for the live feed.
    refetchInterval: 15000,
  })

  // List of the user's QR codes — used to populate the multi-select picker
  // in Compare mode. Shows title + scan count so users can pick the codes
  // they care about comparing.
  const { data: qrCodesData } = useQuery({
    queryKey: ['qr-codes'],
    queryFn: () => api.get<{ data: QrCodeRecord[] }>('/api/qr-codes'),
    enabled: plan !== 'free' && mode === 'compare',
  })

  // Fetch analytics for each selected QR code in parallel. The endpoint
  // `/api/qr-codes/[id]/analytics?range=` already exists and returns the
  // same AnalyticsSummary shape as the global aggregate.
  const compareQueries = useQueries({
    queries: selectedIds.map((qid) => ({
      queryKey: ['qr-codes', qid, 'analytics', range],
      queryFn: () => api.get<AnalyticsSummary>(`/api/qr-codes/${qid}/analytics?range=${range}`),
      enabled: mode === 'compare',
      staleTime: 30_000,
    })),
  })

  // ── Supabase Realtime: subscribe to new scans for the live feed ──
  useEffect(() => {
    if (plan === 'free' || mode !== 'single') return
    const sb = getSupabaseClient()
    if (!sb) return // Supabase not configured — fall back to polling only

    const channel = sb
      .channel('scans-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scans' },
        () => {
          // Invalidate the query to refetch with the new scan
          queryClient.invalidateQueries({ queryKey: ['analytics', range] })
        }
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [plan, range, queryClient, mode])

  // ---------- Free user locked state ----------
  if (plan === 'free') {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track every scan with deep, real-time insights.
          </p>
        </div>
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
                <div className="mt-4 h-64 rounded-xl border border-border bg-card p-4">
                  <div className="h-full w-full rounded bg-gradient-to-br from-brand-muted/60 to-muted" />
                </div>
              </div>

              {/* Lock overlay */}
              <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
                <div className="max-w-md p-6 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-muted text-brand">
                    <Lock className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-xl font-bold">Unlock scan analytics</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Upgrade to a paid plan to see total scans, unique visitors, top countries,
                    devices, referrers and real-time activity.
                  </p>
                  <Button
                    onClick={() => navigate('billing')}
                    className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90"
                  >
                    Upgrade to Starter <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------- Paid user analytics ----------
  const maxRange = limits.analyticsDays ?? 99999
  const isRangeAllowed = (r: RangeKey) => {
    const opt = RANGE_OPTIONS.find((o) => o.key === r)!
    return opt.days <= maxRange
  }

  const summary = data
  const top = summary?.topCountries?.[0]

  const handleExportCSV = () => {
    if (!summary) return
    const rows = summary.recent
    const headers = ['scanned_at', 'qr_code_title', 'qr_type', 'country', 'city', 'device', 'os', 'browser', 'referrer', 'language']
    const lines = [headers.join(',')]
    for (const r of rows) {
      const cells = [
        r.scannedAt, r.qrTitle, r.qrType, r.countryName ?? '', '', r.deviceType ?? '',
        r.os ?? '', r.browser ?? '', '', '',
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`)
      lines.push(cells.join(','))
    }
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-export-${range}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time scan insights across all your QR codes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1 border-brand/40 text-brand">
            <Crown className="h-3 w-3" /> {plan.charAt(0).toUpperCase() + plan.slice(1)} plan
          </Badge>
          {(plan === 'pro' || plan === 'business') && (
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Period selector + Compare toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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
                title={!allowed ? `Available on a higher plan` : undefined}
              >
                {opt.label}
                {!allowed && <Lock className="h-3 w-3" />}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => setMode('single')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all sm:text-sm',
              mode === 'single' ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Overview
          </button>
          <button
            onClick={() => setMode('compare')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all sm:text-sm',
              mode === 'compare' ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <GitCompare className="h-3.5 w-3.5" /> Compare
          </button>
        </div>
      </div>

      {mode === 'compare' ? (
        <CompareView
          qrCodes={qrCodesData?.data ?? []}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          compareQueries={compareQueries}
        />
      ) : isLoading || !summary ? (
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
          {/* Chart skeleton */}
          <div className="skeleton-shimmer h-64 w-full rounded-xl" />
          {/* Donut skeletons side by side */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="skeleton-shimmer h-48 w-full rounded-xl" />
            <div className="skeleton-shimmer h-48 w-full rounded-xl" />
          </div>
        </div>
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

          {/* QR Performance + Real-time feed */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">QR Code Performance</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Top scanned QR codes.</p>
              </CardHeader>
              <CardContent>
                {summary.qrPerformance.length === 0 ? (
                  <EmptyChart label="No scans recorded yet." />
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead className="hidden sm:table-cell">Type</TableHead>
                          <TableHead className="text-right">Scans</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.qrPerformance.slice(0, 8).map((q) => (
                          <TableRow key={q.id}>
                            <TableCell className="max-w-[160px] truncate font-medium">{q.title}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="secondary" className="text-[10px] capitalize">{q.qrType}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(q.count)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Real-time feed */}
            <Card className="border-brand/30">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Real-Time Feed</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Latest scan events.</p>
                </div>
                <Badge className="bg-brand-muted text-brand">
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                  Live
                </Badge>
              </CardHeader>
              <CardContent>
                <RecentScansFeed scans={summary.recent} />
              </CardContent>
            </Card>
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

          {/* CSV export for paid users */}
          {(plan === 'pro' || plan === 'business') && (
            <Card className="border-dashed border-border bg-card">
              <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Export scan data</p>
                  <p className="text-sm text-muted-foreground">
                    Download all scans in this range as a CSV file.
                  </p>
                </div>
                <Button onClick={handleExportCSV} variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Download CSV
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Upgrade nudge for Starter users */}
          {plan === 'starter' && (
            <Card className="border-brand/30 bg-gradient-to-r from-brand-muted to-transparent">
              <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground">
                    <Activity className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">Want deeper insights?</p>
                    <p className="text-sm text-muted-foreground">
                      Upgrade to Pro for 1-year analytics, real-time feed, and CSV export.
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate('billing')} className="bg-brand text-brand-foreground hover:bg-brand/90">
                  Upgrade to Pro <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ── Compare mode ────────────────────────────────────────────────────────────

const MAX_COMPARE = 5

interface CompareQueryResult {
  data?: AnalyticsSummary
  isLoading: boolean
  isError: boolean
}

function CompareView({
  qrCodes,
  selectedIds,
  setSelectedIds,
  compareQueries,
}: {
  qrCodes: QrCodeRecord[]
  selectedIds: string[]
  setSelectedIds: (ids: string[]) => void
  compareQueries: CompareQueryResult[]
}) {
  const toggleId = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id))
    } else if (selectedIds.length < MAX_COMPARE) {
      setSelectedIds([...selectedIds, id])
    } else {
      toast.error(`You can compare up to ${MAX_COMPARE} QR codes at a time`)
    }
  }

  // Build a row per selected QR with the values we want to compare.
  const rows = selectedIds.map((qid, i) => {
    const code = qrCodes.find((c) => c.id === qid)
    const a = compareQueries[i]?.data
    const topCountry = a?.topCountries?.[0]
    return {
      id: qid,
      title: code?.title ?? '—',
      total: a?.total ?? 0,
      unique: a?.unique ?? 0,
      topCountryName: topCountry?.name ?? '—',
      topCountryCount: topCountry?.count ?? 0,
      peakHour: a?.peakHour ?? -1,
      loaded: !!a,
    }
  })

  // Determine the "best" value per column so we can highlight it. For Total
  // Scans and Unique Visitors the best is simply the max. For Top Country
  // the best is the QR whose top country has the most scans. Peak Time has
  // no meaningful "best" so we leave it unhighlighted.
  const bestTotal = rows.length ? Math.max(...rows.map((r) => r.total)) : 0
  const bestUnique = rows.length ? Math.max(...rows.map((r) => r.unique)) : 0
  const bestCountryCount = rows.length ? Math.max(...rows.map((r) => r.topCountryCount)) : 0

  // Bar-chart data — one entry per selected QR with total + unique counts.
  const chartData = rows.map((r) => ({
    name: r.title.length > 16 ? r.title.slice(0, 14) + '…' : r.title,
    fullName: r.title,
    total: r.total,
    unique: r.unique,
  }))

  const anyLoading = compareQueries.some((q) => q.isLoading)
  const allEmpty = rows.length === 0

  return (
    <div className="space-y-4">
      {/* QR picker */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitCompare className="h-4 w-4 text-brand" /> Select QR codes to compare
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick 2–{MAX_COMPARE} QR codes to see their scan stats side by side.
                Currently selected: <span className="font-medium text-foreground">{selectedIds.length}</span>/{MAX_COMPARE}.
              </p>
            </div>
            {selectedIds.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {qrCodes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              You don&apos;t have any QR codes yet. Create one to start comparing.
            </p>
          ) : (
            <div className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto scroll-thin sm:grid-cols-2">
              {qrCodes.map((c) => {
                const checked = selectedIds.includes(c.id)
                const disabled = !checked && selectedIds.length >= MAX_COMPARE
                return (
                  <label
                    key={c.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-lg border border-border p-2.5 text-sm transition-colors hover:bg-accent',
                      disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                      checked && 'border-brand/40 bg-brand-muted/30'
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() => toggleId(c.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {formatNumber(c.scanCount)} scans
                    </Badge>
                  </label>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {allEmpty ? (
        <EmptyChart label="Select at least one QR code above to see the comparison." />
      ) : anyLoading ? (
        <div className="skeleton-shimmer h-64 w-full rounded-xl" />
      ) : (
        <>
          {/* Comparison table */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Side-by-side comparison</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Best value in each column is highlighted.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>QR Code</TableHead>
                      <TableHead className="text-right">Total Scans</TableHead>
                      <TableHead className="text-right">Unique Visitors</TableHead>
                      <TableHead>Top Country</TableHead>
                      <TableHead className="text-right">Peak Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="max-w-[200px] truncate font-medium">{r.title}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5',
                              r.total === bestTotal && r.total > 0 && 'bg-brand-muted font-semibold text-brand'
                            )}
                          >
                            {r.loaded ? formatNumber(r.total) : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5',
                              r.unique === bestUnique && r.unique > 0 && 'bg-brand-muted font-semibold text-brand'
                            )}
                          >
                            {r.loaded ? formatNumber(r.unique) : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5',
                              r.topCountryCount === bestCountryCount && r.topCountryCount > 0 && 'bg-brand-muted font-semibold text-brand'
                            )}
                          >
                            {r.loaded ? r.topCountryName : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {r.loaded && r.peakHour >= 0
                            ? `${String(r.peakHour).padStart(2, '0')}:00`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Grouped bar chart: total + unique per selected QR */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Total scans vs unique visitors</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Compare scan volume across the selected QR codes.
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 12, bottom: 5, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        color: 'var(--foreground)',
                        fontSize: 12,
                      }}
                      formatter={(v: number, name: string) => [formatNumber(v), name]}
                      labelFormatter={(_l, payload) => (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName ?? ''}
                    />
                    <Bar dataKey="total" name="Total Scans" fill={DEVICE_COLOR} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="unique" name="Unique Visitors" fill={UNIQUE_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
        </>
      )}
    </div>
  )
}

export default AnalyticsView
