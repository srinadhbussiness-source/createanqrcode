
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const folders = await db.folder.findMany({
    where: { userId: session.userId },
    orderBy: { name: 'asc' },
  })
  const counts = await db.qrCode.groupBy({
    by: ['folderId'],
    where: { userId: session.userId, trashed: false },
    _count: true,
  })
  const countMap = new Map(counts.map((c) => [c.folderId ?? '__none', c._count]))
  return NextResponse.json({
    data: folders.map((f) => ({
      ...f,
      count: countMap.get(f.id) ?? 0,
      createdAt: f.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Folder name required.' }, { status: 400 })
  const folder = await db.folder.create({
    data: { userId: session.userId, name: name.trim().slice(0, 50), color: color ?? '#7C3AED' },
  })
  return NextResponse.json({ ...folder, count: 0, createdAt: folder.createdAt.toISOString() }, { status: 201 })
}
