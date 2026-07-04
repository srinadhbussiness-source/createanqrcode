
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { PLAN_LIMITS } from '@/lib/types'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const plan = session.user.plan
  // analyticsDays: null = unlimited (Business). 0 = no access.
  const planDays = PLAN_LIMITS[plan].analyticsDays
  const days = planDays ?? 0
  const unlimited = planDays === null

  const since = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : new Date(0)
  const rangeParam = req.nextUrl.searchParams.get('range') // 7|30|90|365|all
  let rangeDays = unlimited ? 99999 : days
  if (rangeParam === '7') rangeDays = 7
  else if (rangeParam === '30') rangeDays = 30
  else if (rangeParam === '90') rangeDays = 90
  else if (rangeParam === '365') rangeDays = 365
  else if (rangeParam === 'all') rangeDays = 99999
  // Cap range to the plan's analytics window (unlimited plans skip the cap)
  if (!unlimited && rangeDays > days) rangeDays = days
  const effectiveSince = rangeDays > 0 ? new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000) : new Date(0)

  const scans = await db.scan.findMany({
    where: { qrCode: { userId: session.userId }, scannedAt: { gte: effectiveSince } },
    include: { qrCode: { select: { id: true, title: true, qrType: true } } },
    orderBy: { scannedAt: 'desc' },
    take: 5000,
  })

  const total = scans.length
  const uniqueIps = new Set(scans.map((s) => s.ipHash)).size

  // Country breakdown
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

  // Device
  const deviceMap = new Map<string, number>()
  for (const s of scans) if (s.deviceType) deviceMap.set(s.deviceType, (deviceMap.get(s.deviceType) ?? 0) + 1)
  const devices = [...deviceMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

  // OS
  const osMap = new Map<string, number>()
  for (const s of scans) if (s.os) osMap.set(s.os, (osMap.get(s.os) ?? 0) + 1)
  const oses = [...osMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

  // Browser
  const brMap = new Map<string, number>()
  for (const s of scans) if (s.browser) brMap.set(s.browser, (brMap.get(s.browser) ?? 0) + 1)
  const browsers = [...brMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

  // Referrers
  const refMap = new Map<string, number>()
  for (const s of scans) if (s.referrer) refMap.set(s.referrer, (refMap.get(s.referrer) ?? 0) + 1)
  const referrers = [...refMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8)

  // Scans over time (daily buckets)
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

  // Peak time (hour of day)
  const hourMap = new Array(24).fill(0)
  for (const s of scans) hourMap[s.scannedAt.getHours()]++
  const peakHour = hourMap.indexOf(Math.max(...hourMap))

  // Heatmap (7x24)
  const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
  for (const s of scans) {
    const day = s.scannedAt.getDay()
    const hour = s.scannedAt.getHours()
    heatmap[day][hour]++
  }

  // QR performance
  const qrPerfMap = new Map<string, { title: string; qrType: string; count: number }>()
  for (const s of scans) {
    const ex = qrPerfMap.get(s.qrCode.id) ?? { title: s.qrCode.title, qrType: s.qrCode.qrType, count: 0 }
    ex.count++
    qrPerfMap.set(s.qrCode.id, ex)
  }
  const qrPerformance = [...qrPerfMap.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Recent scans (real-time feed)
  const recent = scans.slice(0, 50).map((s) => ({
    id: s.id, countryCode: s.countryCode, countryName: s.countryName,
    deviceType: s.deviceType, os: s.os, browser: s.browser,
    qrTitle: s.qrCode.title, qrType: s.qrCode.qrType,
    scannedAt: s.scannedAt.toISOString(),
  }))

  return NextResponse.json({
    hasAccess: unlimited || days > 0,
    days,
    rangeDays: rangeDays > 0 ? rangeDays : 0,
    total, unique: uniqueIps,
    topCountries, devices, oses, browsers, referrers,
    overTime, peakHour, heatmap, qrPerformance, recent,
    since: since.toISOString(),
  })
}
