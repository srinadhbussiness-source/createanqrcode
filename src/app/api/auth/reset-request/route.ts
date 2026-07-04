
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateVerifyToken, rateLimit, rateLimitHeaders } from '@/lib/auth'
import { sendEmail, resetEmail, getBaseUrl } from '@/lib/email'

// Prevent reset-request spam: 5 per IP per hour.
const RESET_LIMIT = 5
const RESET_WINDOW = 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip') || 'unknown'
  const rl = rateLimit(`reset:${ip}`, RESET_LIMIT, RESET_WINDOW)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many reset requests. Try again later.' },
      { status: 429, headers: rateLimitHeaders(rl) }
    )
  }
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required.' }, { status: 400, headers: rateLimitHeaders(rl) })
    // Always return the same message (prevent enumeration).
    const user = await db.user.findUnique({ where: { email } })
    if (user) {
      const token = generateVerifyToken()
      const exp = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      await db.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExp: exp } })
      // Send the reset email (logged in dev; real SMTP in prod).
      void sendEmail(resetEmail(email, token, getBaseUrl(req)))
    }
    return NextResponse.json({
      message: "If an account exists with this email address, we've sent a password reset link. Check your inbox. The link expires in 1 hour.",
    }, { headers: rateLimitHeaders(rl) })
  } catch {
    return NextResponse.json({ error: 'Request failed.' }, { status: 500, headers: rateLimitHeaders(rl) })
  }
}
