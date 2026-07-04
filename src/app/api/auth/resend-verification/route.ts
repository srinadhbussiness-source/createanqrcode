
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, generateVerifyToken, rateLimit, rateLimitHeaders } from '@/lib/auth'
import { sendEmail, verificationEmail, getBaseUrl } from '@/lib/email'

const RESEND_LIMIT = 5
const RESEND_WINDOW = 60 * 60 * 1000

/** POST /api/auth/resend-verification — regenerate + resend the verification email. */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rl = rateLimit(`resend:${session.userId}`, RESEND_LIMIT, RESEND_WINDOW)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many resend requests. Try again later.' }, { status: 429, headers: rateLimitHeaders(rl) })
  }
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.emailVerified) return NextResponse.json({ ok: true, message: 'Email already verified.' })
  const token = generateVerifyToken()
  const exp = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await db.user.update({ where: { id: user.id }, data: { verifyToken: token, verifyTokenExp: exp } })
  void sendEmail(verificationEmail(user.email, token, getBaseUrl(req)))
  return NextResponse.json({ ok: true, message: 'Verification email sent. Check your inbox.' })
}
