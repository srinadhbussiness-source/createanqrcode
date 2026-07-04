
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession } from '@/lib/auth'

/** GET /api/admin/payments — list all payments across the platform. */
export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'))
  const perPage = Math.min(100, Number(req.nextUrl.searchParams.get('per_page') ?? '20'))

  const [total, payments] = await Promise.all([
    db.payment.count(),
    db.payment.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { user: { select: { email: true, name: true } } },
    }),
  ])

  const totalRevenue = await db.payment.aggregate({
    _sum: { amount: true },
    where: { status: 'paid' },
  })

  return NextResponse.json({
    data: payments.map((p) => ({
      id: p.id, plan: p.plan, amount: p.amount, currency: p.currency,
      status: p.status, invoiceId: p.invoiceId,
      createdAt: p.createdAt.toISOString(),
      user: p.user,
    })),
    pagination: { total, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(total / perPage)) },
    totalRevenueUSD: totalRevenue._sum.amount ?? 0,
  })
}
