
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import type { QrDesign, RedirectRule } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/qr-codes/[id]/revisions — list the edit history for a QR code.
 * Returns revisions newest-first, each with a snapshot of the editable
 * fields at that point in time. Ownership-checked.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const code = await db.qrCode.findFirst({ where: { id, userId: session.userId } })
  if (!code) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const revisions = await db.qrCodeRevision.findMany({
    where: { qrCodeId: id },
    orderBy: { editedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({
    data: revisions.map((r) => ({
      id: r.id,
      qrCodeId: r.qrCodeId,
      title: r.title,
      staticPayload: r.staticPayload,
      destinationUrl: r.destinationUrl,
      design: JSON.parse(r.design) as QrDesign,
      logoDataUrl: r.logoDataUrl,
      redirectRules: r.redirectRules ? (JSON.parse(r.redirectRules) as RedirectRule[]) : null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      maxScans: r.maxScans,
      status: r.status,
      editedBy: r.editedBy,
      editedAt: r.editedAt.toISOString(),
    })),
  })
}

/**
 * POST /api/qr-codes/[id]/revisions — revert the QR code to a previous revision.
 * Body: { revisionId: string }
 * Restores title, staticPayload, destinationUrl, design, logoDataUrl,
 * redirectRules, expiresAt, maxScans, status from the snapshot. Does NOT
 * restore isDynamic/shortCode/folderId/tags/favorite (those are structural,
 * not content). Also logs a NEW revision of the current state before
 * reverting (so the revert itself is undoable).
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const c = await db.qrCode.findFirst({ where: { id, userId: session.userId } })
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { revisionId } = body as { revisionId?: string }
  if (!revisionId) return NextResponse.json({ error: 'revisionId is required' }, { status: 400 })

  const rev = await db.qrCodeRevision.findFirst({ where: { id: revisionId, qrCodeId: id } })
  if (!rev) return NextResponse.json({ error: 'Revision not found' }, { status: 404 })

  // Log the CURRENT state as a revision before reverting (so the revert is undoable)
  await db.qrCodeRevision.create({
    data: {
      qrCodeId: id,
      title: c.title,
      staticPayload: c.staticPayload,
      destinationUrl: c.destinationUrl,
      design: c.design,
      logoDataUrl: c.logoDataUrl,
      redirectRules: c.redirectRules,
      expiresAt: c.expiresAt,
      maxScans: c.maxScans,
      status: c.status,
      editedBy: session.user.email,
    },
  }).catch(() => {})

  // Restore the snapshot
  const updated = await db.qrCode.update({
    where: { id },
    data: {
      title: rev.title,
      staticPayload: rev.staticPayload,
      destinationUrl: rev.destinationUrl,
      design: rev.design,
      logoDataUrl: rev.logoDataUrl,
      redirectRules: rev.redirectRules,
      expiresAt: rev.expiresAt,
      maxScans: rev.maxScans,
      status: rev.status,
    },
  })

  return NextResponse.json({
    ...updated,
    design: JSON.parse(updated.design) as QrDesign,
    redirectRules: updated.redirectRules ? (JSON.parse(updated.redirectRules) as RedirectRule[]) : null,
    tags: JSON.parse(updated.tags) as string[],
    expiresAt: updated.expiresAt?.toISOString() ?? null,
    activatesAt: updated.activatesAt?.toISOString() ?? null,
    trashedAt: updated.trashedAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  })
}
