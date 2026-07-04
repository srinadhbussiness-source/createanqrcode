
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, hashApiKey } from '@/lib/auth'
import { generateApiKey } from '@/lib/format'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.plan === 'free' || session.user.plan === 'starter') {
    return NextResponse.json({ error: 'API access requires Pro plan or higher.' }, { status: 403 })
  }
  const keys = await db.apiKey.findMany({ where: { userId: session.userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    data: keys.map((k) => ({
      id: k.id, name: k.name, prefix: k.prefix, scopes: k.scopes,
      lastUsed: k.lastUsed?.toISOString() ?? null, createdAt: k.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.plan === 'free' || session.user.plan === 'starter') {
    return NextResponse.json({ error: 'API access requires Pro plan or higher.' }, { status: 403 })
  }
  const { name, scopes } = await req.json() as { name: string; scopes?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'Key name required.' }, { status: 400 })
  const rawKey = generateApiKey()
  const keyHash = hashApiKey(rawKey)
  const prefix = rawKey.slice(0, 12)
  const key = await db.apiKey.create({
    data: {
      userId: session.userId,
      name: name.trim(),
      keyHash,
      prefix,
      scopes: scopes?.includes('write') ? 'read,write' : 'read',
    },
  })
  return NextResponse.json({
    id: key.id, name: key.name, prefix: key.prefix, scopes: key.scopes,
    rawKey, createdAt: key.createdAt.toISOString(),
  }, { status: 201 })
}
