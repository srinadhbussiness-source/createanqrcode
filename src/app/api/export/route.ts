
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Safe JSON.parse — returns null on failure so a single corrupt row never
// crashes the whole export.
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const qrCodes = await db.qrCode.findMany({ where: { userId: session.userId } })
  const folders = await db.folder.findMany({ where: { userId: session.userId } })
  const apiKeys = await db.apiKey.findMany({ where: { userId: session.userId } })
  const payments = await db.payment.findMany({ where: { userId: session.userId } })

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      email: user.email, name: user.name, plan: user.plan,
      timezone: user.timezone, dateFormat: user.dateFormat,
      createdAt: user.createdAt.toISOString(),
    },
    qrCodes: qrCodes.map((c) => ({
      ...c,
      design: safeParse(c.design) ?? null,
      tags: safeParse<string[]>(c.tags) ?? [],
      redirectRules: safeParse(c.redirectRules),
      createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString() ?? null, trashedAt: c.trashedAt?.toISOString() ?? null,
    })),
    folders: folders.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })),
    apiKeys: apiKeys.map((k) => ({ name: k.name, prefix: k.prefix, scopes: k.scopes, createdAt: k.createdAt.toISOString() })),
    payments: payments.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
  }
  return NextResponse.json(exportData)
}
