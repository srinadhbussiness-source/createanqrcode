
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const c = await db.qrCode.findFirst({ where: { id, userId: session.userId } })
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const scans = await db.scan.findMany({
    where: { qrCodeId: id },
    orderBy: { scannedAt: 'desc' },
    take: 500,
  })
  return NextResponse.json({
    data: scans.map((s) => ({ ...s, scannedAt: s.scannedAt.toISOString() })),
  })
}
