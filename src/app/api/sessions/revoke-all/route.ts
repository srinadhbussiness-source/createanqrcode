
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

/** POST /api/sessions/revoke-all — revoke ALL sessions except the current one. */
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Find the current session (the one matching the cookie token) so we can keep it.
  const cookieStore = await import('next/headers').then(m => m.cookies())
  const currentToken = cookieStore.get('caqr-token')?.value
  const result = await db.session.deleteMany({
    where: { userId: session.userId, token: { not: currentToken ?? '' } },
  })
  return NextResponse.json({ revoked: result.count })
}
