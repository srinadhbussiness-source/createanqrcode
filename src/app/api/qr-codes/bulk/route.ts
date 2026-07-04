
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { ids, action, value } = (await req.json()) as {
      ids: string[]; action: 'archive' | 'trash' | 'restore' | 'delete' | 'moveFolder' | 'addTag' | 'removeFavorite'; value?: string
    }
    if (!ids?.length) return NextResponse.json({ error: 'No codes selected.' }, { status: 400 })

    const codes = await db.qrCode.findMany({ where: { id: { in: ids }, userId: session.userId } })
    if (!codes.length) return NextResponse.json({ error: 'No matching codes.' }, { status: 404 })

    let updated = 0
    // Validate folderId ownership up-front for the moveFolder action so we
    // don't silently reassign codes into another user's folder.
    if (action === 'moveFolder' && value) {
      const folder = await db.folder.findFirst({ where: { id: value, userId: session.userId } })
      if (!folder) return NextResponse.json({ error: 'Folder not found.' }, { status: 400 })
    }
    for (const c of codes) {
      const patch: Record<string, unknown> = {}
      if (action === 'archive') { patch.archived = true; patch.status = 'archived' }
      else if (action === 'trash') { patch.trashed = true; patch.trashedAt = new Date(); patch.status = 'trashed' }
      else if (action === 'restore') { patch.trashed = false; patch.trashedAt = null; patch.archived = false; patch.status = 'active' }
      else if (action === 'delete') { await db.qrCode.delete({ where: { id: c.id } }); updated++; continue }
      else if (action === 'moveFolder') patch.folderId = value ?? null
      else if (action === 'addTag') {
        const tags = JSON.parse(c.tags) as string[]
        if (value && !tags.includes(value)) tags.push(value)
        patch.tags = JSON.stringify(tags)
      }
      else if (action === 'removeFavorite') { patch.favorite = false }
      await db.qrCode.update({ where: { id: c.id }, data: patch })
      updated++
    }
    return NextResponse.json({ updated })
  } catch {
    return NextResponse.json({ error: 'Bulk action failed.' }, { status: 500 })
  }
}
