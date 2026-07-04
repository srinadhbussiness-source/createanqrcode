
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { PLAN_LIMITS } from '@/lib/types'
import type { QrDesign, QrTypeId } from '@/lib/types'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limit = PLAN_LIMITS[session.user.plan].bulkBatch ?? 0
  if (limit === 0) return NextResponse.json({ error: 'Bulk generation requires Pro plan or higher.' }, { status: 403 })

  // Accept both the legacy single `folderId` (applied to every row) and a
  // per-row `folderKey` (CSV column name whose value is the folder ID for that
  // specific row). `logoDataUrl` is persisted alongside `design` so bulk codes
  // keep their logo (was previously dropped).
  const { rows, qrType, design, titleKey, payloadKey, folderId, folderKey, logoDataUrl } = await req.json() as {
    rows: Array<Record<string, string>>;
    qrType: QrTypeId; design: QrDesign; logoDataUrl?: string | null;
    titleKey: string; payloadKey: string; folderId?: string | null; folderKey?: string | null;
  }
  if (!rows?.length) return NextResponse.json({ error: 'No rows provided.' }, { status: 400 })
  if (rows.length > limit) return NextResponse.json({ error: `Batch exceeds your plan limit of ${limit}.` }, { status: 403 })

  const errors: Array<{ row: number; error: string }> = []
  let created = 0

  // If a single `folderId` is supplied, validate ownership once up-front.
  if (folderId) {
    const folder = await db.folder.findFirst({ where: { id: folderId, userId: session.userId } })
    if (!folder) return NextResponse.json({ error: 'Folder not found.' }, { status: 400 })
  }

  // Persist valid rows. Use per-row folderId when `folderKey` is provided so
  // each row can land in its own folder (was: only the first row's folder was
  // used for every code).
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const title = row[titleKey]?.trim()
    const payload = row[payloadKey]?.trim()
    if (!title || !payload) { errors.push({ row: i + 1, error: 'Missing title or payload' }); continue }

    let rowFolderId: string | null = null
    if (folderKey) {
      const cellValue = row[folderKey]?.trim()
      if (cellValue) {
        // Validate per-row folder ownership before assigning.
        const folder = await db.folder.findFirst({ where: { id: cellValue, userId: session.userId } })
        if (!folder) { errors.push({ row: i + 1, error: 'Folder not found' }); continue }
        rowFolderId = cellValue
      }
    } else if (folderId) {
      rowFolderId = folderId
    }

    await db.qrCode.create({
      data: {
        userId: session.userId,
        title,
        qrType,
        isDynamic: false,
        staticPayload: payload,
        design: JSON.stringify(design),
        logoDataUrl: logoDataUrl ?? null,
        tags: '[]',
        folderId: rowFolderId,
      },
    })
    created++
  }

  return NextResponse.json({ created, errors, total: rows.length })
}
