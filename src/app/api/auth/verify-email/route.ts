
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({ token: z.string().min(1) })

/**
 * POST /api/auth/verify-email
 * Consumes a verification token (emailed at signup). Marks the user's email as
 * verified and clears the token. The token expires after 24h (set at signup).
 */
export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Token is required.' }, { status: 400 })

  const user = await db.user.findFirst({
    where: { verifyToken: parsed.data.token, verifyTokenExp: { gt: new Date() } },
  })
  if (!user) {
    return NextResponse.json({ error: 'Verification link is invalid or has expired. Please request a new one.' }, { status: 400 })
  }
  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null, verifyTokenExp: null },
  })
  return NextResponse.json({
    ok: true,
    message: 'Email verified successfully!',
    user: {
      id: user.id, email: user.email, name: user.name, plan: user.plan,
      emailVerified: true,
    },
  })
}
