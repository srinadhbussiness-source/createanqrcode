
import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, revokeSession } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('caqr-token')?.value
  // Revoke the server-side session row so the token can't be replayed,
  // then clear the browser cookie.
  if (token) await revokeSession(token)
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
