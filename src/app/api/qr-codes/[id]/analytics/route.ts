
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { PLAN_LIMITS } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

/**
 * Per-QR analytics — the deep scan breakdown for a single dynamic QR code.
 *
 * Mirrors the shape of /api/analytics/summary but scoped to one QR code:
 *   total, unique, topCountries, devices, oses, browsers, referrers,
 *   overTime (daily), peakHour, heatmap (7x24), recent feed.
 *
 * Access rules:
 *   - Auth required (ownership-checked).
 *   - Static QR codes → 400 (no scan tracking for static codes).
 *   - Plan-gated range: free=7d, starter=30d, pro=365d, business=unlimited.
 *     The `range` query param (7|30|90|365|all) is honoured but capped to
 *     the plan's analytics window.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const code = await db.qrCode.findFirst({ where: { id, userId: session.userId } })
  if (!code) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!code.isDynamic) {
    return NextResponse.json(
      { error: 'Analytics are only available for dynamic QR codes.' },
      { status: 400 },
    )
  }

  const plan = session.user.plan
  const planDays = PLAN_LIMITS[plan].analyticsDays // null = unlimited (Business); 0 = no access
  const unlimited = planDays === null
  const days = planDays ?? 0

  // Resolve the effective range, capped to the plan's window.
  const rangeParam = req.nextUrl.searchParams.get('range') // 7|30|90|365|all
  let rangeDays = unlimited ? 99999 : days
  if (rangeParam === '7') rangeDays = 7
  else if (rangeParam === '30') rangeDays = 30
  else if (rangeParam === '90') rangeDays = 90
  else if (rangeParam === '365') rangeDays = 365
  else if (rangeParam === 'all') rangeDays = 99999
  if (!unlimited && rangeDays > days) rangeDays = days

  const effectiveSince =
    rangeDays > 0 ? new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000) : new Date(0)

  const scans = await db.scan.findMany({
    where: { qrCodeId: id, scannedAt: { gte: effectiveSince } },
    orderBy: { scannedAt: 'desc' },
    take: 5000,
  })

  const total = scans.length
  const uniqueIps = new Set(scans.map((s) => s.ipHash)).size

  // ── Country breakdown ────────────────────────────────────────────────
  const countryMap = new Map<string, { count: number; name: string }>()
  for (const s of scans) {
    if (!s.countryCode) continue
    const ex = countryMap.get(s.countryCode) ?? { count: 0, name: s.countryName ?? s.countryCode }
    ex.count++
    countryMap.set(s.countryCode, ex)
  }
  const topCountries = [...countryMap.entries()]
    .map(([code, v]) => ({ code, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Device / OS / Browser ────────────────────────────────────────────
  const tally = (field: 'deviceType' | 'os' | 'browser') => {
    const m = new Map<string, number>()
    for (const s of scans) {
      const v = s[field]
      if (!v) continue
      m.set(v, (m.get(v) ?? 0) + 1)
    }
    return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }
  const devices = tally('deviceType')
  const oses = tally('os')
  const browsers = tally('browser')

  // ── Referrers ────────────────────────────────────────────────────────
  const refMap = new Map<string, number>()
  for (const s of scans) if (s.referrer) refMap.set(s.referrer, (refMap.get(s.referrer) ?? 0) + 1)
  const referrers = [...refMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // ── Scans over time (daily buckets, with unique visitors) ───────────
  const timeMap = new Map<string, { total: number; unique: Set<string> }>()
  for (const s of scans) {
    const d = s.scannedAt.toISOString().slice(0, 10)
    const ex = timeMap.get(d) ?? { total: 0, unique: new Set<string>() }
    ex.total++
    ex.unique.add(s.ipHash ?? '')
    timeMap.set(d, ex)
  }
  const overTime = [...timeMap.entries()]
    .map(([date, v]) => ({ date, total: v.total, unique: v.unique.size }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ── Peak hour + 7×24 heatmap ────────────────────────────────────────
  const hourMap = new Array(24).fill(0)
  const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
  for (const s of scans) {
    const h = s.scannedAt.getHours()
    hourMap[h]++
    heatmap[s.scannedAt.getDay()][h]++
  }
  const peakHour = total > 0 ? hourMap.indexOf(Math.max(...hourMap)) : -1

  // ── Recent scans feed ───────────────────────────────────────────────
  const recent = scans.slice(0, 50).map((s) => ({
    id: s.id,
    countryCode: s.countryCode,
    countryName: s.countryName,
    deviceType: s.deviceType,
    os: s.os,
    browser: s.browser,
    qrTitle: code.title,
    qrType: code.qrType,
    scannedAt: s.scannedAt.toISOString(),
  }))

  return NextResponse.json({
    hasAccess: unlimited || days > 0,
    days,
    rangeDays: rangeDays > 0 ? rangeDays : 0,
    total,
    unique: uniqueIps,
    topCountries,
    devices,
    oses,
    browsers,
    referrers,
    overTime,
    peakHour,
    heatmap,
    qrPerformance: [{ id: code.id, title: code.title, qrType: code.qrType, count: total }],
    recent,
    // Extra per-QR context the summary endpoint doesn't need:
    qr: {
      id: code.id,
      title: code.title,
      qrType: code.qrType,
      scanCount: code.scanCount,
      maxScans: code.maxScans,
      status: code.status,
      createdAt: code.createdAt.toISOString(),
    },
    since: effectiveSince.toISOString(),
  })
}
