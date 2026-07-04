
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { verify } from 'otplib'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(4).max(20),
})

// Generate 10 single-use backup codes. Each is 8 chars, base32-ish (uppercase
// A-Z + 2-7) so it's easy to read/type from a printout. Returns the plaintext
// codes (for one-time display to the user) and the bcrypt-hashed versions to
// persist. Hashing uses cost 12 — same as the user password.
function generateBackupCodes(): { plaintext: string[]; hashed: string[] } {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const plaintext: string[] = []
  for (let i = 0; i < 10; i++) {
    const bytes = randomBytes(8)
    let code = ''
    for (let j = 0; j < 8; j++) code += alphabet[bytes[j] % alphabet.length]
    // Format as XXXX-XXXX for readability.
    plaintext.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  const hashed = plaintext.map((c) => bcrypt.hashSync(c, 12))
  return { plaintext, hashed }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // If 2FA is already enabled, the user must explicitly disable before
  // re-verifying (prevents creating a second set of backup codes).
  if (session.user.twoFactorEnabled) {
    return NextResponse.json({ error: 'Two-factor authentication is already enabled.' }, { status: 400 })
  }
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'A 6-digit code is required.' }, { status: 400 })
  }
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user || !user.twoFactorSecret) {
    return NextResponse.json({ error: 'No 2FA setup in progress. Start setup first.' }, { status: 400 })
  }
  // otplib v13's verify is async + returns { valid: boolean, ... }.
  let valid = false
  try {
    const result = await verify({
      secret: user.twoFactorSecret,
      token: parsed.data.token.replace(/\s+/g, ''),
    })
    valid = !!result.valid
  } catch {
    valid = false
  }
  if (!valid) {
    return NextResponse.json({ error: 'Invalid 2FA code. Try again.' }, { status: 401 })
  }
  const { plaintext, hashed } = generateBackupCodes()
  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorBackupCodes: JSON.stringify(hashed),
    },
  })
  return NextResponse.json({ ok: true, backupCodes: plaintext })
}
