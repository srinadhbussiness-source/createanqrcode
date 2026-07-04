
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, setSessionCookie, generateVerifyToken } from '@/lib/auth'
import { sendEmail, verificationEmail, getBaseUrl } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  name: z.string().min(1).max(80).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Password must be 8+ chars with one uppercase letter and one number.' },
        { status: 400 }
      )
    }
    const { email, password, name } = parsed.data
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }
    const verifyToken = generateVerifyToken()
    const verifyExp = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    const user = await db.user.create({
      data: {
        email,
        name: name?.trim() || null,
        passwordHash: await hashPassword(password),
        plan: 'free',
        emailVerified: false,
        verifyToken,
        verifyTokenExp: verifyExp,
      },
    })
    const token = await createSession(user.id)
    await setSessionCookie(token)
    // Send the verification email (logged in dev; real SMTP in prod).
    void sendEmail(verificationEmail(email, verifyToken, getBaseUrl(req)))
    return NextResponse.json({
      id: user.id, email: user.email, name: user.name, plan: user.plan,
      trialEndsAt: typeof user.trialEndsAt === 'string' ? user.trialEndsAt : user.trialEndsAt?.toISOString?.() ?? null,
      timezone: user.timezone, dateFormat: user.dateFormat,
      emailVerified: user.emailVerified, avatarUrl: user.avatarUrl,
      createdAt: typeof user.createdAt === 'string' ? user.createdAt : user.createdAt?.toISOString(),
      notifSecurity: user.notifSecurity, notifTrial: user.notifTrial,
      notifScans: user.notifScans, notifExpiry: user.notifExpiry,
      notifDigest: user.notifDigest, notifUpdates: user.notifUpdates,
    }, { status: 201 })
  } catch (e) {
    console.error('Signup error:', e)
    return NextResponse.json({ error: 'Sign up failed. Please try again.' }, { status: 500 })
  }
}
