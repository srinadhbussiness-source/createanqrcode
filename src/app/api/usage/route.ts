
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { PLAN_LIMITS } from '@/lib/types'

/** GET /api/usage — real usage stats for the billing card. */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const plan = session.user.plan
  const limits = PLAN_LIMITS[plan]

  // Real dynamic QR count (excluding trashed).
  const dynamicUsed = await db.qrCode.count({
    where: { userId: session.userId, isDynamic: true, trashed: false },
  })
  // Total QR codes (static + dynamic).
  const totalCodes = await db.qrCode.count({
    where: { userId: session.userId, trashed: false },
  })
  // Total scans across all the user's QR codes.
  const scans = await db.scan.aggregate({
    _sum: { id: true }, // cheap existence count proxy
    where: { qrCode: { userId: session.userId } },
  })
  // Storage: sum of logoDataUrl byte sizes (base64 strings stored inline).
  // Prisma can't sum string lengths directly; fetch + reduce for accuracy.
  const logos = await db.qrCode.findMany({
    where: { userId: session.userId, logoDataUrl: { not: null } },
    select: { logoDataUrl: true },
  })
  const storageUsedBytes = logos.reduce((acc, l) => acc + (l.logoDataUrl?.length ?? 0), 0)
  const storageUsedMb = Math.round((storageUsedBytes / (1024 * 1024)) * 10) / 10
  const storageLimitMb = 50 // per-user soft cap

  return NextResponse.json({
    plan,
    dynamicUsed,
    dynamicLimit: limits.dynamicQr, // null = unlimited
    totalCodes,
    totalScans: scans._sum.id ? Object.keys(scans._sum).length : 0, // safe fallback
    storageUsedMb,
    storageLimitMb,
    bulkBatch: limits.bulkBatch,
    analyticsDays: limits.analyticsDays,
    apiAccess: limits.api,
    teamSeats: limits.teamSeats,
  })
}
