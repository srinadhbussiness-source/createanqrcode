
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateShortCode } from '@/lib/format'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const c = await db.qrCode.findFirst({ where: { id, userId: session.userId } })
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Copy ALL fields except: id (auto), shortCode (regenerated), scanCount
  // (reset to 0), createdAt/updatedAt (auto). Keep the original isDynamic flag
  // so a dynamic QR is duplicated as dynamic (with a fresh shortCode).
  const dup = await db.qrCode.create({
    data: {
      userId: session.userId,
      title: `Copy of ${c.title}`,
      qrType: c.qrType,
      isDynamic: c.isDynamic,
      status: 'active',
      staticPayload: c.staticPayload,
      // Generate a fresh shortCode for dynamic duplicates so both codes don't
      // resolve to the same scan target.
      shortCode: c.isDynamic ? generateShortCode() : null,
      destinationUrl: c.destinationUrl,
      passwordHash: c.passwordHash,
      expiresAt: c.expiresAt,
      maxScans: c.maxScans,
      redirectRules: c.redirectRules,
      design: c.design,
      logoDataUrl: c.logoDataUrl,
      favorite: false,
      archived: false,
      trashed: false,
      trashedAt: null,
      folderId: c.folderId,
      tags: c.tags,
      scanCount: 0,
      downloadCount: 0,
    },
  })
  return NextResponse.json({ id: dup.id }, { status: 201 })
}
