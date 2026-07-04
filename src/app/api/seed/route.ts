
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { seedDemoScans } from '@/lib/seed'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { qrCodeId, count } = await req.json() as { qrCodeId: string; count?: number }
  const qr = await db.qrCode.findFirst({ where: { id: qrCodeId, userId: session.userId } })
  if (!qr) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!qr.isDynamic) return NextResponse.json({ error: 'Only dynamic QR codes track scans.' }, { status: 400 })
  const n = await seedDemoScans(qrCodeId, count ?? 50)
  return NextResponse.json({ seeded: n })
}
