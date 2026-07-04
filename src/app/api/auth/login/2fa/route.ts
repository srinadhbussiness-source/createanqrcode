
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie, rateLimit, rateLimitHeaders } from '@/lib/auth'
import { verify } from 'otplib'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  tempToken: z.string().min(1),
  token: z.string().min(4).max(20),
})

// A pending 2FA session must be redeemed within 10 minutes of being issued.
const PENDING_TTL_MS = 10 * 60 * 1000

// Brute-force protection on the 2FA code itself: 10 attempts per tempToken
// per 10 minutes. Each failed attempt counts against the bucket.
const LIMIT = 10
const WINDOW = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  const rl = rateLimit(`2fa-login:${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'}`, LIMIT, WINDOW)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    )
  }
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: rateLimitHeaders(rl) })
    }
    const { tempToken, token } = parsed.data

    // Look up the pending session. Must exist, belong to a user with 2FA on,
    // and be younger than the TTL.
    const session = await db.session.findUnique({
      where: { token: tempToken },
      include: { user: true },
    })
    if (!session || !session.twoFactorPending) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401, headers: rateLimitHeaders(rl) })
    }
    if (Date.now() - session.createdAt.getTime() > PENDING_TTL_MS) {
      // Expired — delete the pending row to keep the table tidy.
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return NextResponse.json({ error: 'This 2FA session has expired. Please log in again.' }, { status: 401, headers: rateLimitHeaders(rl) })
    }
    const user = session.user
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: 'Two-factor authentication is not enabled.' }, { status: 400, headers: rateLimitHeaders(rl) })
    }

    // Try the TOTP token first. Then fall back to backup codes (single-use).
    let verified = false
    let usedBackupCodeIndex = -1
    try {
      const result = await verify({
        secret: user.twoFactorSecret,
        token: token.replace(/\s+/g, ''),
      })
      verified = !!result.valid
    } catch {
      // otplib can throw on malformed tokens — treat as failed verification.
      verified = false
    }
    if (!verified && user.twoFactorBackupCodes) {
      try {
        const hashedCodes = JSON.parse(user.twoFactorBackupCodes) as string[]
        for (let i = 0; i < hashedCodes.length; i++) {
          const h = hashedCodes[i]
          if (!h) continue
          // Each backup code is bcrypt-hashed (same scheme as the password).
          // Only compare after stripping whitespace and uppercasing (codes
          // are case-insensitive when displayed).
          if (await bcrypt.compare(token.trim().toUpperCase(), h)) {
            verified = true
            usedBackupCodeIndex = i
            break
          }
        }
      } catch {
        // Corrupt backup codes JSON — ignore and fall through to the failure path.
      }
    }

    if (!verified) {
      return NextResponse.json({ error: 'Invalid 2FA code.' }, { status: 401, headers: rateLimitHeaders(rl) })
    }

    // If a backup code was used, strike it from the stored array (single-use).
    if (usedBackupCodeIndex >= 0) {
      try {
        const hashedCodes = JSON.parse(user.twoFactorBackupCodes!) as string[]
        hashedCodes[usedBackupCodeIndex] = ''
        await db.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: JSON.stringify(hashedCodes) },
        })
      } catch {
        // Non-fatal — the login still succeeds.
      }
    }

    // Promote the pending session: flip the flag, mark as the current
    // session, then set the cookie. We reuse the existing token rather than
    // minting a new one so the client doesn't need to track a second value.
    await db.session.update({
      where: { id: session.id },
      data: { twoFactorPending: false, current: true },
    })
    await setSessionCookie(tempToken)

    return NextResponse.json({
      id: user.id, email: user.email, name: user.name, plan: user.plan,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      timezone: user.timezone, dateFormat: user.dateFormat,
      emailVerified: user.emailVerified, avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      twoFactorEnabled: user.twoFactorEnabled ?? false,
      notifSecurity: user.notifSecurity, notifTrial: user.notifTrial,
      notifScans: user.notifScans, notifExpiry: user.notifExpiry,
      notifDigest: user.notifDigest, notifUpdates: user.notifUpdates,
    }, { headers: rateLimitHeaders(rl) })
  } catch {
    return NextResponse.json({ error: '2FA verification failed.' }, { status: 500 })
  }
}
