
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Settings update (profile, preferences, notifications)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const allowed: Record<string, unknown> = {}
  for (const k of ['name', 'avatarUrl', 'timezone', 'dateFormat', 'notifSecurity', 'notifTrial', 'notifScans', 'notifExpiry', 'notifDigest', 'notifUpdates']) {
    if (k in body) allowed[k] = body[k]
  }
  const updated = await db.user.update({ where: { id: session.userId }, data: allowed })
  return NextResponse.json({
    id: updated.id, email: updated.email, name: updated.name, plan: updated.plan,
    trialEndsAt: updated.trialEndsAt?.toISOString() ?? null,
    timezone: updated.timezone, dateFormat: updated.dateFormat,
    emailVerified: updated.emailVerified, avatarUrl: updated.avatarUrl,
    createdAt: updated.createdAt.toISOString(),
    notifSecurity: updated.notifSecurity, notifTrial: updated.notifTrial,
    notifScans: updated.notifScans, notifExpiry: updated.notifExpiry,
    notifDigest: updated.notifDigest, notifUpdates: updated.notifUpdates,
  })
}

// Delete account
export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await db.user.delete({ where: { id: session.userId } })
  return NextResponse.json({ ok: true })
}
