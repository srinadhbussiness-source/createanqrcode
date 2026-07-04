
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'

type Params = { params: Promise<{ id: string }> }

/** DELETE /api/sessions/[id] — revoke one session by id (not the current one). */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // Ownership check: the session must belong to the current user.
  const target = await db.session.findUnique({ where: { id } })
  if (!target || target.userId !== session.userId) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  // Don't allow revoking the current session via this endpoint (use logout).
  if (target.current) {
    return NextResponse.json({ error: 'Use logout to end your current session' }, { status: 400 })
  }
  await db.session.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// Unused import guard — cookies not needed for revoke, but kept for future use.
void cookies
