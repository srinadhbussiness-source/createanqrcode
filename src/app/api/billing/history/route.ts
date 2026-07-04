
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payments = await db.payment.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    data: payments.map((p) => ({
      id: p.id, plan: p.plan, amount: p.amount, currency: p.currency,
      status: p.status, invoiceId: p.invoiceId, createdAt: p.createdAt.toISOString(),
    })),
  })
}
