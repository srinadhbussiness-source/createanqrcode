
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession } from '@/lib/auth'

/** GET /api/admin/qr-codes — list ALL QR codes across the platform (with filters). */
export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'))
  const perPage = Math.min(100, Number(req.nextUrl.searchParams.get('per_page') ?? '20'))
  const search = req.nextUrl.searchParams.get('search') ?? ''
  const status = req.nextUrl.searchParams.get('status') ?? ''

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { destinationUrl: { contains: search } },
      { user: { email: { contains: search } } },
    ]
  }
  if (status === 'trashed') where.trashed = true
  else if (status === 'dynamic') where.isDynamic = true
  else if (status === 'password') where.passwordHash = { not: null }

  const [total, codes] = await Promise.all([
    db.qrCode.count({ where }),
    db.qrCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { user: { select: { email: true, name: true } } },
    }),
  ])

  return NextResponse.json({
    data: codes.map((c) => ({
      id: c.id, title: c.title, qrType: c.qrType, isDynamic: c.isDynamic,
      status: c.status, destinationUrl: c.destinationUrl,
      shortCode: c.shortCode, scanCount: c.scanCount,
      trashed: c.trashed, passwordProtected: !!c.passwordHash,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
    })),
    pagination: { total, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(total / perPage)) },
  })
}
