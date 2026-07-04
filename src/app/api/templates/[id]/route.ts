
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { SYSTEM_TEMPLATES } from '@/lib/templates-data'
import type { QrDesign } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // System templates (in-memory, no DB row) cannot be renamed.
  if (SYSTEM_TEMPLATES.some((t) => t.id === id)) {
    return NextResponse.json({ error: 'System templates cannot be renamed.' }, { status: 403 })
  }
  const { name } = await req.json() as { name?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'Template name required.' }, { status: 400 })
  // Ownership check: only the owner can rename their template.
  const existing = await db.template.findFirst({ where: { id, userId: session.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await db.template.update({
    where: { id },
    data: { name: name.trim().slice(0, 80) },
  })
  return NextResponse.json({
    id: updated.id, name: updated.name, category: 'custom', isPro: false,
    design: JSON.parse(updated.design) as QrDesign, userId: updated.userId, isSystem: false,
    createdAt: updated.createdAt.toISOString(),
  })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // System templates (in-memory, no DB row, userId null) cannot be deleted.
  if (SYSTEM_TEMPLATES.some((t) => t.id === id)) {
    return NextResponse.json({ error: 'System templates cannot be deleted.' }, { status: 403 })
  }
  // Ownership check: only the owner can delete their template.
  const existing = await db.template.findFirst({ where: { id, userId: session.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.template.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
