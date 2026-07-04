
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, hashPassword, verifyPassword } from '@/lib/auth'
import { cookies } from 'next/headers'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
})

/** POST /api/settings/password — change password (verifies current, hashes new). */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'New password must be 8+ chars with one uppercase and one number.' }, { status: 400 })
  }
  const { currentPassword, newPassword } = parsed.data
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: 'Account has no password set.' }, { status: 400 })
  }
  const ok = await verifyPassword(currentPassword, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })
  }
  const newHash = await hashPassword(newPassword)
  await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })
  // Security best-practice: invalidate all OTHER sessions (keep the current one
  // so the user isn't logged out mid-flow).
  const cookieStore = await cookies()
  const currentToken = cookieStore.get('caqr-token')?.value
  await db.session.deleteMany({
    where: { userId: user.id, token: { not: currentToken ?? '' } },
  })
  return NextResponse.json({ ok: true })
}
