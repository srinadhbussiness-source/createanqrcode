'use client'

/**
 * Shared analytics building blocks.
 *
 * Used by both the global Analytics view (`/analytics`) and the per-QR
 * analytics panel on the QR detail page. Keeping these in one place means the
 * two surfaces stay visually + behaviourally consistent and any chart tweak
 * only has to happen once.
 */

import { useMemo } from 'react'
import {
  BarChart3, Smartphone, Monitor, Tablet, Radio, Globe,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

// ── Public types ──────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  hasAccess: boolean
  days: number | null
  rangeDays: number
  total: number
  unique: number
  topCountries: { code: string; name: string; count: number }[]
  devices: { name: string; count: number }[]
  oses: { name: string; count: number }[]
  browsers: { name: string; count: number }[]
  referrers: { name: string; count: number }[]
  overTime: { date: string; total: number; unique: number }[]
  peakHour: number
  heatmap: number[][]
  qrPerformance: { id: string; title: string; qrType: string; count: number }[]
  recent: {
    id: string
    countryCode: string | null
    countryName: string | null
    deviceType: string | null
    os: string | null
    browser: string | null
    qrTitle: string
    qrType: string
    scannedAt: string
  }[]
}

export type RangeKey = '7' | '30' | '90' | '365' | 'all'

export const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: '365', label: '1 year', days: 365 },
  { key: 'all', label: 'All time', days: 99999 },
]

// ── Country / device lookups ──────────────────────────────────────────────

// Country code → full name (monochrome — no flag emojis which are colorful)
export const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India', US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  DE: 'Germany', FR: 'France', JP: 'Japan', CN: 'China', BR: 'Brazil', MX: 'Mexico',
  ES: 'Spain', IT: 'Italy', NL: 'Netherlands', SG: 'Singapore', AE: 'UAE', SA: 'Saudi Arabia',
  ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', EG: 'Egypt', RU: 'Russia', KR: 'South Korea',
  ID: 'Indonesia', TH: 'Thailand', MY: 'Malaysia', PH: 'Philippines', VN: 'Vietnam',
  PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka', NP: 'Nepal', TR: 'Turkey', PL: 'Poland',
  SE: 'Sweden', CH: 'Switzerland', AT: 'Austria', BE: 'Belgium', IE: 'Ireland', PT: 'Portugal',
  GR: 'Greece', FI: 'Finland', DK: 'Denmark', NO: 'Norway', CZ: 'Czechia', RO: 'Romania',
  HU: 'Hungary', IL: 'Israel', AR: 'Argentina', CL: 'Chile', CO: 'Colombia', PE: 'Peru',
  VE: 'Venezuela', NZ: 'New Zealand', HK: 'Hong Kong', TW: 'Taiwan',
}

export function countryName(code: string | null | undefined): string {
  if (!code) return 'Unknown'
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase()
}

export function countryCode(code: string | null | undefined): string {
  return code ? code.toUpperCase() : '—'
}

export const DEVICE_ICON: Record<string, typeof Smartphone> = {
  mobile: Smartphone, tablet: Tablet, desktop: Monitor,
}

// Monochrome palette (no indigo/blue)
export const DEVICE_COLOR = '#18181B'
export const UNIQUE_COLOR = '#9ca3af' // muted grey
export const DONUT_COLORS = ['#18181B', '#52525B', '#71717A', '#A1A1AA', '#D4D4D8', '#E4E4E7']

// ── Reusable presentational components ────────────────────────────────────

export function StatCard({
  label, value, hint, icon: Icon, accent,
}: { label: string; value: string; hint?: string; icon: typeof Globe; accent?: boolean }) {
  return (
    <Card className="border-border">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
            {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
          </div>
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', accent ? 'bg-brand-muted text-brand' : 'bg-muted text-muted-foreground')}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function DonutCard({
  title, data, icon: Icon,
}: { title: string; data: { name: string; count: number }[]; icon: typeof Globe }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 || total === 0 ? (
          <EmptyChart />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={70}
                    paddingAngle={2}
                    stroke="var(--card)"
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: 8, color: 'var(--foreground)', fontSize: 12,
                    }}
                    formatter={(v: number) => [`${formatNumber(v)} scans`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 self-stretch">
              {data.slice(0, 5).map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 truncate">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="capitalize">{d.name}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {formatNumber(d.count)} · {pct(d.count, total)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function Heatmap({ data }: { data: number[][] }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const max = useMemo(() => {
    let m = 0
    for (const row of data) for (const v of row) if (v > m) m = v
    return m || 1
  }, [data])
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="mb-1 flex pl-10">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
        </div>
        {data.map((row, d) => (
          <div key={d} className="mb-1 flex items-center">
            <div className="w-10 shrink-0 text-[10px] font-medium text-muted-foreground">{days[d]}</div>
            <div className="flex flex-1 gap-0.5">
              {row.map((v, h) => {
                const intensity = v / max
                const bg = v === 0 ? 'var(--muted)' : `oklch(0.541 0.281 293 / ${0.15 + intensity * 0.85})`
                return (
                  <div
                    key={h}
                    title={`${days[d]} ${String(h).padStart(2, '0')}:00 — ${v} scans`}
                    className="h-5 flex-1 rounded-sm transition-colors hover:outline hover:outline-1 hover:outline-brand"
                    style={{ background: bg }}
                  />
                )
              })}
            </div>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          Less
          {[0.1, 0.3, 0.5, 0.75, 1].map((i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-sm"
              style={{ background: `oklch(0.541 0.281 293 / ${0.15 + i * 0.85})` }}
            />
          ))}
          More
        </div>
      </div>
    </div>
  )
}

export function EmptyChart({ label = 'No data yet.' }: { label?: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
      <BarChart3 className="h-6 w-6 text-muted-foreground/50" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

/**
 * The "Scans Over Time" line chart — total scans vs unique visitors.
 * Used by both the global analytics view and the per-QR analytics panel.
 */
export function ScansOverTimeChart({
  data, granularity,
}: {
  data: { date: string; total: number; unique: number }[]
  granularity: 'daily' | 'weekly' | 'monthly'
}) {
  const aggregated = aggregateOverTime(data, granularity)
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={aggregated} margin={{ top: 5, right: 12, bottom: 5, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11 }}
            tickFormatter={(d) => shortDate(d)}
            minTickGap={24}
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
            labelStyle={{ color: 'var(--muted-foreground)' }}
          />
          <Line type="monotone" dataKey="total" stroke={DEVICE_COLOR} strokeWidth={2} dot={false} name="Total" />
          <Line type="monotone" dataKey="unique" stroke={UNIQUE_COLOR} strokeWidth={2} dot={false} name="Unique" strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Top-countries horizontal bar chart + list with percentages. */
export function TopCountriesChart({
  data, total,
}: {
  data: { code: string; name: string; count: number }[]
  total: number
}) {
  if (data.length === 0) return <EmptyChart />
  return (
    <>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="code"
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 11 }}
              width={44}
              tickFormatter={(v) => countryCode(v)}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--foreground)', fontSize: 12,
              }}
              formatter={(v: number, _n, p) => [`${formatNumber(v)} scans`, p?.payload?.name ?? '']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-1.5">
        {data.slice(0, 5).map((c) => (
          <div key={c.code} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="inline-flex h-5 min-w-[28px] items-center justify-center rounded border border-border px-1 font-mono text-[10px] font-medium text-muted-foreground">{countryCode(c.code)}</span>
              <span className="font-medium">{c.name}</span>
            </span>
            <span className="text-muted-foreground">
              {formatNumber(c.count)} · {pct(c.count, total)}%
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

/** Top-referrers progress-bar list. */
export function TopReferrersList({
  data,
}: {
  data: { name: string; count: number }[]
}) {
  if (data.length === 0) return <EmptyChart />
  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((r) => {
        const max = data[0].count || 1
        const w = Math.max(6, Math.round((r.count / max) * 100))
        return (
          <div key={r.name}>
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-medium">{r.name}</span>
              <span className="ml-2 shrink-0 text-muted-foreground">{formatNumber(r.count)}</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${w}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Real-time / recent scans feed. */
export function RecentScansFeed({
  scans, emptyLabel = 'No scans in this period.',
}: {
  scans: AnalyticsSummary['recent']
  emptyLabel?: string
}) {
  if (scans.length === 0) return <EmptyChart label={emptyLabel} />
  return (
    <div className="max-h-80 space-y-1 overflow-y-auto scroll-thin pr-1">
      {scans.slice(0, 20).map((s) => {
        const DIcon = s.deviceType ? (DEVICE_ICON[s.deviceType.toLowerCase()] ?? Radio) : Radio
        return (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-2.5"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-card font-mono text-[10px] font-semibold text-muted-foreground">
              {countryCode(s.countryCode)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{s.qrTitle}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {s.countryName ?? 'Unknown'} · {s.os ?? '?'} · {s.browser ?? '?'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <DIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────

export function pct(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export function shortDate(d: string) {
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return d
  }
}

export function aggregateOverTime(
  overTime: { date: string; total: number; unique: number }[],
  granularity: 'daily' | 'weekly' | 'monthly'
) {
  if (!overTime?.length) return []
  if (granularity === 'daily') return overTime
  const buckets = new Map<string, { total: number; unique: number }>()
  for (const p of overTime) {
    const dt = new Date(p.date)
    let key = p.date
    if (granularity === 'weekly') {
      const day = dt.getDay()
      const sunday = new Date(dt)
      sunday.setDate(dt.getDate() - day)
      key = sunday.toISOString().slice(0, 10)
    } else if (granularity === 'monthly') {
      key = p.date.slice(0, 7) + '-01'
    }
    const ex = buckets.get(key) ?? { total: 0, unique: 0 }
    ex.total += p.total
    ex.unique += p.unique
    buckets.set(key, ex)
  }
  return [...buckets.entries()]
    .map(([date, v]) => ({ date, total: v.total, unique: v.unique }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
