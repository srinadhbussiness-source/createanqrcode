
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateSecret, generateURI } from 'otplib'

// Generate a fresh TOTP secret + otpauth URL for the user to scan with their
// authenticator app. The secret is persisted on the user record (so a re-open
// of the setup dialog can re-display the same secret) but 2FA is NOT enabled
// yet — that only happens after the user proves they can produce a valid
// 6-digit code via /api/auth/2fa/verify.
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Don't allow re-running setup when 2FA is already on — the user should
  // disable first (which clears the secret).
  if (session.user.twoFactorEnabled) {
    return NextResponse.json({ error: 'Two-factor authentication is already enabled.' }, { status: 400 })
  }
  const secret = generateSecret()
  // otpauth://totp/Issuer:label?secret=...&issuer=...
  const otpauthUrl = generateURI({
    issuer: 'CreateAnQRCode',
    label: session.user.email,
    secret,
  })
  await db.user.update({
    where: { id: session.userId },
    data: { twoFactorSecret: secret },
  })
  return NextResponse.json({ secret, otpauthUrl })
}
