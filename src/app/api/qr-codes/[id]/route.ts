
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'
import { generateShortCode } from '@/lib/format'
import { PLAN_LIMITS } from '@/lib/types'
import type { QrDesign, RedirectRule } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const c = await db.qrCode.findFirst({ where: { id, userId: session.userId } })
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    ...c,
    design: JSON.parse(c.design) as QrDesign,
    redirectRules: c.redirectRules ? (JSON.parse(c.redirectRules) as RedirectRule[]) : null,
    tags: JSON.parse(c.tags) as string[],
    expiresAt: c.expiresAt?.toISOString() ?? null,
    activatesAt: c.activatesAt?.toISOString() ?? null,
    trashedAt: c.trashedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const c = await db.qrCode.findFirst({ where: { id, userId: session.userId } })
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const body = await req.json()
    const allowed: Record<string, unknown> = {}
    // NOTE: 'passwordHash' is intentionally NOT in this allow-list. The client
    // sends a plaintext 'password' which we hash server-side below.
    for (const k of ['title', 'status', 'staticPayload', 'destinationUrl', 'maxScans', 'favorite', 'archived', 'trashed', 'folderId', 'logoDataUrl', 'overlayDataUrl']) {
      if (k in body) allowed[k] = body[k]
    }
    if ('overlayOpacity' in body) allowed['overlayOpacity'] = body.overlayOpacity ?? 40
    // Convert static → dynamic (or vice versa). When converting to dynamic we
    // generate a fresh shortCode and enforce the plan's dynamic-QR limit. The
    // reverse (dynamic → static) clears the shortCode + destination so the code
    // stops resolving publicly.
    if ('isDynamic' in body) {
      const wantDynamic = !!body.isDynamic
      if (wantDynamic && !c.isDynamic) {
        const limit = PLAN_LIMITS[session.user.plan].dynamicQr
        if (limit !== null) {
          const count = await db.qrCode.count({ where: { userId: session.userId, isDynamic: true } })
          // Exclude the code being converted from the count (it's currently static).
          if (count >= limit) {
            return NextResponse.json(
              { error: `Dynamic QR limit reached (${limit}). Upgrade your plan for more.` },
              { status: 403 },
            )
          }
        }
        allowed['isDynamic'] = true
        if (!c.shortCode) allowed['shortCode'] = generateShortCode()
      } else if (!wantDynamic && c.isDynamic) {
        allowed['isDynamic'] = false
        // Keep shortCode/destinationUrl so historical links still resolve, but
        // mark as static. (User can re-convert if needed.)
      }
    }
    if ('expiresAt' in body) allowed['expiresAt'] = body.expiresAt ? new Date(body.expiresAt) : null
    if ('activatesAt' in body) allowed['activatesAt'] = body.activatesAt ? new Date(body.activatesAt) : null
    if ('trashed' in body) allowed['trashedAt'] = body.trashed ? new Date() : null
    if ('design' in body) allowed['design'] = JSON.stringify(body.design)
    if ('redirectRules' in body) allowed['redirectRules'] = body.redirectRules ? JSON.stringify(body.redirectRules) : null
    if ('tags' in body) allowed['tags'] = JSON.stringify(body.tags ?? [])
    // Server-side password hashing: empty string clears the password, a
    // non-empty string sets/replaces it.
    if ('password' in body) {
      const pw = body.password
      allowed['passwordHash'] = (typeof pw === 'string' && pw.trim()) ? await hashPassword(pw) : null
    }

    // Folder ownership check — prevents reassigning a QR code to another user's folder.
    // `allowed.folderId` may be a string (assign) or null (unassign); only validate when set.
    if (typeof allowed.folderId === 'string' && allowed.folderId) {
      const folder = await db.folder.findFirst({ where: { id: allowed.folderId, userId: session.userId } })
      if (!folder) return NextResponse.json({ error: 'Folder not found.' }, { status: 400 })
    }

    const updated = await db.qrCode.update({ where: { id }, data: allowed })

    // Log a revision snapshot of the PRE-edit state so users can view the
    // full edit timeline and revert. Only log when meaningful fields changed
    // (skip favorite/toggle-only changes to avoid noise).
    const meaningfulKeys = ['title', 'staticPayload', 'destinationUrl', 'design', 'logoDataUrl', 'overlayDataUrl', 'overlayOpacity', 'redirectRules', 'expiresAt', 'maxScans', 'status', 'isDynamic', 'activatesAt']
    if (Object.keys(allowed).some((k) => meaningfulKeys.includes(k))) {
      await db.qrCodeRevision.create({
        data: {
          qrCodeId: id,
          title: c.title,
          staticPayload: c.staticPayload,
          destinationUrl: c.destinationUrl,
          design: c.design,
          logoDataUrl: c.logoDataUrl,
          overlayDataUrl: c.overlayDataUrl,
          overlayOpacity: c.overlayOpacity,
          redirectRules: c.redirectRules,
          expiresAt: c.expiresAt,
          maxScans: c.maxScans,
          status: c.status,
          editedBy: session.user.email,
        },
      }).catch(() => { /* best-effort — don't fail the update */ })
    }

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
  } catch {
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const c = await db.qrCode.findFirst({ where: { id, userId: session.userId } })
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.qrCode.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
