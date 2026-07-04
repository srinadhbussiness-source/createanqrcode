
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession } from '@/lib/auth'

/** GET /api/admin/audit — paginated, filterable audit log. */
export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'))
  const perPage = Math.min(100, Number(req.nextUrl.searchParams.get('per_page') ?? '30'))
  const action = req.nextUrl.searchParams.get('action') ?? ''

  const where = action ? { action: { contains: action } } : {}

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])

  return NextResponse.json({
    data: logs.map((l) => ({
      id: l.id,
      actorId: l.actorId,
      actorEmail: l.actorEmail,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      metadata: l.metadata ? JSON.parse(l.metadata) : null,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    })),
    pagination: { total, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(total / perPage)) },
  })
}
