
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession, auditLog } from '@/lib/auth'

/** GET /api/admin/users — list all users with pagination + search. */
export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'))
  const perPage = Math.min(100, Number(req.nextUrl.searchParams.get('per_page') ?? '20'))
  const search = req.nextUrl.searchParams.get('search') ?? ''

  const where = search
    ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] }
    : {}

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, email: true, name: true, plan: true, role: true,
        suspended: true, emailVerified: true, createdAt: true,
        trialEndsAt: true, avatarUrl: true,
        _count: { select: { qrCodes: { where: { trashed: false } } } },
      },
    }),
  ])

  return NextResponse.json({
    data: users.map((u) => ({
      ...u,
      trialEndsAt: u.trialEndsAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      qrCount: u._count.qrCodes,
    })),
    pagination: { total, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(total / perPage)) },
  })
}
