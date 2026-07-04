
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession, auditLog } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

/** DELETE /api/admin/qr-codes/[id] — admin takedown: force-trash a QR code. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const qr = await db.qrCode.findUnique({ where: { id }, include: { user: { select: { email: true } } } })
  if (!qr) return NextResponse.json({ error: 'QR code not found' }, { status: 404 })

  // Admin takedown = force-trash + set status to 'archived' so the scan route blocks it.
  await db.qrCode.update({
    where: { id },
    data: { trashed: true, trashedAt: new Date(), status: 'archived', archived: true },
  })

  void auditLog({
    actorId: session.userId,
    actorEmail: session.user.email,
    action: 'qr.takedown',
    targetType: 'qr_code',
    targetId: id,
    metadata: { title: qr.title, ownerEmail: qr.user.email, shortCode: qr.shortCode },
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  })

  return NextResponse.json({ ok: true, message: 'QR code taken down' })
}
