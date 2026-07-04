
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminSession, auditLog } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

/** PATCH /api/admin/users/[id] — suspend / unsuspend / change plan / change role. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await req.json() as {
    suspended?: boolean
    suspendReason?: string
    plan?: string
    role?: string
  }

  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Prevent self-suspension and demoting yourself
  if (id === session.userId && body.suspended === true) {
    return NextResponse.json({ error: 'You cannot suspend your own account' }, { status: 400 })
  }
  if (id === session.userId && body.role && body.role !== 'admin' && body.role !== 'superadmin') {
    return NextResponse.json({ error: 'You cannot demote yourself' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.suspended !== undefined) {
    data.suspended = body.suspended
    data.suspendedAt = body.suspended ? new Date() : null
    data.suspendedReason = body.suspended ? (body.suspendReason ?? null) : null
  }
  if (body.plan) data.plan = body.plan
  if (body.role) data.role = body.role

  const updated = await db.user.update({ where: { id }, data })

  void auditLog({
    actorId: session.userId,
    actorEmail: session.user.email,
    action: body.suspended === true ? 'user.suspend' : body.suspended === false ? 'user.unsuspend' : body.plan ? 'user.changePlan' : 'user.changeRole',
    targetType: 'user',
    targetId: id,
    metadata: { email: target.email, changes: body },
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  })

  return NextResponse.json({
    id: updated.id, email: updated.email, plan: updated.plan, role: updated.role,
    suspended: updated.suspended, suspendedReason: updated.suspendedReason,
  })
}
