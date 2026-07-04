
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession, auditLog } from '@/lib/auth'

/** GET /api/admin/stats — platform-wide KPIs for the admin overview. */
export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers, newUsers24h, newUsers7d, suspendedUsers,
    totalQrCodes, dynamicQrCodes, trashedQrCodes,
    totalScans, scans24h, scans7d,
    totalPayments, revenue30d,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: dayAgo } } }),
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.user.count({ where: { suspended: true } }),
    db.qrCode.count(),
    db.qrCode.count({ where: { isDynamic: true, trashed: false } }),
    db.qrCode.count({ where: { trashed: true } }),
    db.scan.count(),
    db.scan.count({ where: { scannedAt: { gte: dayAgo } } }),
    db.scan.count({ where: { scannedAt: { gte: weekAgo } } }),
    db.payment.count({ where: { status: 'paid' } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: 'paid', createdAt: { gte: monthAgo } } }),
  ])

  // Plan distribution
  const planDistribution = await db.user.groupBy({
    by: ['plan'],
    _count: { plan: true },
  })

  void auditLog({
    actorId: session.userId,
    actorEmail: session.user.email,
    action: 'admin.viewStats',
    targetType: 'system',
  })

  return NextResponse.json({
    users: { total: totalUsers, new24h: newUsers24h, new7d: newUsers7d, suspended: suspendedUsers },
    qrCodes: { total: totalQrCodes, dynamic: dynamicQrCodes, trashed: trashedQrCodes },
    scans: { total: totalScans, last24h: scans24h, last7d: scans7d },
    revenue: {
      totalPayments,
      revenue30dUSD: revenue30d._sum.amount ?? 0,
    },
    planDistribution: planDistribution.map((p) => ({ plan: p.plan, count: p._count.plan })),
  })
}
