
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.plan === 'free' || session.user.plan === 'starter') {
    return NextResponse.json({ error: 'API access requires Pro plan or higher.' }, { status: 403 })
  }
  const { id } = await params
  const key = await db.apiKey.findFirst({ where: { id, userId: session.userId } })
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const { name } = await req.json() as { name?: string }
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Key name required.' }, { status: 400 })
    }
    const updated = await db.apiKey.update({ where: { id }, data: { name: name.trim() } })
    return NextResponse.json({
      id: updated.id, name: updated.name, prefix: updated.prefix, scopes: updated.scopes,
      lastUsed: updated.lastUsed?.toISOString() ?? null, createdAt: updated.createdAt.toISOString(),
    })
  } catch {
    return NextResponse.json({ error: 'Rename failed.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const key = await db.apiKey.findFirst({ where: { id, userId: session.userId } })
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.apiKey.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
