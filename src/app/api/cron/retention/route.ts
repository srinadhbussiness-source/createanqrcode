
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/cron/retention
 *
 * Trash 30-day retention: permanently deletes QR codes that have been in the
 * trash for more than 30 days (spec 21.5). Also prunes scan rows for deleted
 * codes (cascade) and trims scan data beyond the plan's analytics window.
 *
 * Call this daily via an external scheduler (cron, GitHub Actions, Vercel
 * Cron). Protect it with a shared CRON_SECRET so it can't be abused:
 *   curl -X POST https://yourapp/api/cron/retention \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * In dev (no CRON_SECRET set), the endpoint is open for manual testing.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

  // 1. Permanently delete QR codes trashed >30 days ago.
  const expired = await db.qrCode.deleteMany({
    where: { trashed: true, trashedAt: { lt: cutoff } },
  })

  // 2. (Optional) prune ancient scan rows beyond any plan's window — the
  //    longest plan window is Business = unlimited, so we keep everything
  //    that's within 365 days (the Pro window). Older scans are aggregated
  //    into the scanCount total (which lives on the QrCode row) and the raw
  //    rows can be dropped. Only run if the env flag is set to avoid
  //    surprising data loss in dev.
  let prunedScans = 0
  if (process.env.PRUNE_OLD_SCANS === '1') {
    const scanCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const r = await db.scan.deleteMany({ where: { scannedAt: { lt: scanCutoff } } })
    prunedScans = r.count
  }

  return NextResponse.json({
    ok: true,
    deletedTrashedCodes: expired.count,
    prunedScans,
    cutoff: cutoff.toISOString(),
  })
}
