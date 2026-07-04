
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { name, color } = await req.json()
  const folder = await db.folder.findFirst({ where: { id, userId: session.userId } })
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await db.folder.update({ where: { id }, data: { name: name?.slice(0, 50) ?? folder.name, color: color ?? folder.color } })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const folder = await db.folder.findFirst({ where: { id, userId: session.userId } })
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Unfile codes, then delete folder
  await db.qrCode.updateMany({ where: { folderId: id, userId: session.userId }, data: { folderId: null } })
  await db.folder.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
