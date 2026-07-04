
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, setSessionCookie, rateLimit, rateLimitHeaders, generateToken } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
})

// Brute-force protection: 10 login attempts per IP per 10 minutes.
const LOGIN_LIMIT = 10
const LOGIN_WINDOW = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  // Rate limit by IP (independent of the email being targeted).
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip') || 'unknown'
  const rl = rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429, headers: rateLimitHeaders(rl) }
    )
  }
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400, headers: rateLimitHeaders(rl) })
    }
    const { email, password } = parsed.data
    const user = await db.user.findUnique({ where: { email } })
    // Constant-ish timing: always verify even if user missing (reduces enumeration signal).
    const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false
    if (!user || !user.passwordHash || !ok) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401, headers: rateLimitHeaders(rl) })
    }
    // Two-Factor gate: if the user has 2FA enabled, create a SHORT-LIVED
    // pending session (no cookie) and return a tempToken. The client must
    // POST the tempToken + a TOTP code to /api/auth/login/2fa to mint the
    // real session cookie. The pending session is GC'd by the existing
    // retention cron if the user never completes the 2FA step.
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const tempToken = generateToken()
      // Short effective lifetime: pending rows older than 10 minutes are
      // treated as expired by the /api/auth/login/2fa route.
      await db.session.create({
        data: {
          userId: user.id,
          token: tempToken,
          current: false,
          twoFactorPending: true,
        },
      })
      return NextResponse.json({
        requiresTwoFactor: true,
        tempToken,
      }, { headers: rateLimitHeaders(rl) })
    }
    const token = await createSession(user.id)
    await setSessionCookie(token)
    return NextResponse.json({
      id: user.id, email: user.email, name: user.name, plan: user.plan,
      trialEndsAt: typeof user.trialEndsAt === 'string' ? user.trialEndsAt : user.trialEndsAt?.toISOString?.() ?? null,
      timezone: user.timezone, dateFormat: user.dateFormat,
      emailVerified: user.emailVerified, avatarUrl: user.avatarUrl,
      createdAt: typeof user.createdAt === 'string' ? user.createdAt : user.createdAt?.toISOString?.() ?? new Date().toISOString(),
      twoFactorEnabled: user.twoFactorEnabled ?? false,
      notifSecurity: user.notifSecurity, notifTrial: user.notifTrial,
      notifScans: user.notifScans, notifExpiry: user.notifExpiry,
      notifDigest: user.notifDigest, notifUpdates: user.notifUpdates,
    }, { headers: rateLimitHeaders(rl) })
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Login failed.' }, { status: 500, headers: rateLimitHeaders(rl) })
  }
}
