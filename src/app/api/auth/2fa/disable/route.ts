
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, verifyPassword } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Current password is required.' }, { status: 400 })
  }
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: 'Account has no password set.' }, { status: 400 })
  }
  const ok = await verifyPassword(parsed.data.password, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }
  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    },
  })
  return NextResponse.json({ ok: true })
}
