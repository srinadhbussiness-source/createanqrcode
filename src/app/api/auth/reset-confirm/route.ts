
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Password must be 8+ chars with one uppercase and one number.' }, { status: 400 })
    }
    const { token, password } = parsed.data
    const user = await db.user.findFirst({
      where: { resetToken: token, resetTokenExp: { gt: new Date() } },
    })
    if (!user) {
      return NextResponse.json({ error: 'Reset link is invalid or has expired.' }, { status: 400 })
    }
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password), resetToken: null, resetTokenExp: null },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 })
  }
}
