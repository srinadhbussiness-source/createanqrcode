
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail, notificationEmail, getBaseUrl } from '@/lib/email'

/**
 * POST /api/cron/notifications
 *
 * Wires up the user's notifExpiry + notifScans settings (which previously did
 * nothing). Runs on a schedule (every 1-6h is fine) and:
 *
 *   1. Expiry alerts — for each dynamic QR code whose `expiresAt` falls within
 *      the next 48 hours AND the owning user has `notifExpiry` enabled, send an
 *      email heads-up. De-duplicated via an AuditLog row (action =
 *      'notif.expiry') so we only notify once per QR per cron run window.
 *
 *   2. Scan milestones — for each QR code whose scanCount has just crossed
 *      100 / 500 / 1,000 (within ±5 of the milestone to catch the cron window)
 *      AND the owning user has `notifScans` enabled, send a milestone email.
 *      De-duplicated per milestone via an AuditLog row (action =
 *      'notif.scans.milestone', metadata = the milestone number) so we never
 *      notify twice for the same milestone.
 *
 * Uses the existing `notificationEmail(to, subject, body)` helper — no new
 * template needed. Emails are best-effort: send failures are logged but never
 * crash the run.
 *
 * Call this via an external scheduler:
 *   curl -X POST https://yourapp/api/cron/notifications \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * In dev (no CRON_SECRET set), the endpoint is open for manual testing.
 */

const SCAN_MILESTONES = [100, 500, 1000] as const
const MILESTONE_TOLERANCE = 5 // notify when scanCount is within ±5 of a milestone

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const base = getBaseUrl(req)
  const now = new Date()
  const expiryWindow = new Date(now.getTime() + 48 * 60 * 60 * 1000) // +48h

  // ── 1. Expiry alerts ──────────────────────────────────────────────────────
  let expirySent = 0
  const expiringSoon = await db.qrCode.findMany({
    where: {
      isDynamic: true,
      expiresAt: { gte: now, lte: expiryWindow },
      trashed: false,
      user: { notifExpiry: true, emailVerified: true, suspended: false },
    },
    include: { user: true },
  })

  for (const qr of expiringSoon) {
    // De-dup: skip if we've already sent an expiry notification for this QR.
    const alreadySent = await db.auditLog.findFirst({
      where: { action: 'notif.expiry', targetId: qr.id },
      select: { id: true },
    })
    if (alreadySent) continue

    const hoursLeft = Math.max(
      1,
      Math.round((qr.expiresAt!.getTime() - now.getTime()) / (60 * 60 * 1000)),
    )
    const manageUrl = `${base}/dashboard`
    const body = `Heads up — your dynamic QR code "${qr.title}" is set to expire in about ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} (on ${qr.expiresAt!.toISOString()}). Visitors will stop being redirected once it expires. You can review or extend it from your dashboard: ${manageUrl}`
    try {
      await sendEmail(notificationEmail(qr.user.email, `Your QR code "${qr.title}" expires soon`, body))
      await db.auditLog.create({
        data: {
          actorId: qr.userId,
          actorEmail: qr.user.email,
          action: 'notif.expiry',
          targetType: 'qr_code',
          targetId: qr.id,
          metadata: JSON.stringify({ expiresAt: qr.expiresAt!.toISOString(), hoursLeft }),
        },
      })
      expirySent++
    } catch (err) {
      console.error(`notif.expiry email failed for QR ${qr.id}:`, err)
    }
  }

  // ── 2. Scan milestones ────────────────────────────────────────────────────
  let milestoneSent = 0
  // scanCount within ±5 of any milestone → candidate for notification.
  const milestoneCandidates = await db.qrCode.findMany({
    where: {
      trashed: false,
      scanCount: { gte: SCAN_MILESTONES[0] - MILESTONE_TOLERANCE },
      user: { notifScans: true, emailVerified: true, suspended: false },
    },
    include: { user: true },
  })

  for (const qr of milestoneCandidates) {
    for (const m of SCAN_MILESTONES) {
      if (Math.abs(qr.scanCount - m) > MILESTONE_TOLERANCE) continue
      // De-dup per milestone — record metadata = the milestone number.
      const dedupKey = `m${m}`
      const alreadySent = await db.auditLog.findFirst({
        where: { action: 'notif.scans.milestone', targetId: qr.id, metadata: dedupKey },
        select: { id: true },
      })
      if (alreadySent) continue

      const detailUrl = `${base}/dashboard`
      const body = `Nice work — your QR code "${qr.title}" just crossed ${m.toLocaleString()} scans! Keep track of detailed analytics, top countries, devices, and referrers from your dashboard: ${detailUrl}`
      try {
        await sendEmail(notificationEmail(qr.user.email, `${m.toLocaleString()} scans on "${qr.title}" 🎉`, body))
        await db.auditLog.create({
          data: {
            actorId: qr.userId,
            actorEmail: qr.user.email,
            action: 'notif.scans.milestone',
            targetType: 'qr_code',
            targetId: qr.id,
            metadata: dedupKey,
          },
        })
        milestoneSent++
      } catch (err) {
        console.error(`notif.scans.milestone email failed for QR ${qr.id} (milestone ${m}):`, err)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    expiry: { candidates: expiringSoon.length, sent: expirySent },
    scans: { candidates: milestoneCandidates.length, sent: milestoneSent },
    runAt: now.toISOString(),
  })
}
