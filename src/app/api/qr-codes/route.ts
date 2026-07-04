
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'
import { generateShortCode } from '@/lib/format'
import { PLAN_LIMITS } from '@/lib/types'
import type { QrDesign, QrTypeId, RedirectRule } from '@/lib/types'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const codes = await db.qrCode.findMany({
    where: { userId: session.userId, trashed: false },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json({
    data: codes.map((c) => ({
      ...c,
      design: JSON.parse(c.design) as QrDesign,
      redirectRules: c.redirectRules ? (JSON.parse(c.redirectRules) as RedirectRule[]) : null,
      tags: JSON.parse(c.tags) as string[],
      expiresAt: c.expiresAt?.toISOString() ?? null,
      trashedAt: c.trashedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { title, qrType, isDynamic, staticPayload, destinationUrl, password,
      expiresAt, maxScans, redirectRules, design, logoDataUrl, overlayDataUrl, overlayOpacity, folderId, tags } = body as {
      title: string; qrType: QrTypeId; isDynamic?: boolean;
      staticPayload?: string; destinationUrl?: string; password?: string | null;
      expiresAt?: string | null; maxScans?: number | null; redirectRules?: RedirectRule[] | null;
      design: QrDesign; logoDataUrl?: string | null; overlayDataUrl?: string | null; overlayOpacity?: number;
      folderId?: string | null; tags?: string[];
    }

    if (!title?.trim()) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    if (!design) return NextResponse.json({ error: 'Design is required.' }, { status: 400 })

    // Folder ownership check — prevents assigning a QR code to another user's folder.
    if (folderId) {
      const folder = await db.folder.findFirst({ where: { id: folderId, userId: session.userId } })
      if (!folder) return NextResponse.json({ error: 'Folder not found.' }, { status: 400 })
    }

    // Dynamic QR limit check
    if (isDynamic) {
      const limit = PLAN_LIMITS[session.user.plan].dynamicQr
      if (limit !== null) {
        // Count ALL dynamic QRs (including trashed) so users can't bypass the
        // plan limit by trashing codes and creating new ones.
        const count = await db.qrCode.count({ where: { userId: session.userId, isDynamic: true } })
        if (count >= limit) {
          return NextResponse.json({ error: `Dynamic QR limit reached (${limit}). Upgrade your plan for more.` }, { status: 403 })
        }
      }
    }

    // Server-side hash the QR password (never trust a client-supplied hash).
    let passwordHash: string | null = null
    if (typeof password === 'string' && password.trim()) {
      passwordHash = await hashPassword(password)
    }

    const shortCode = isDynamic ? generateShortCode() : null
    const code = await db.qrCode.create({
      data: {
        userId: session.userId,
        title: title.trim(),
        qrType,
        isDynamic: !!isDynamic,
        staticPayload: staticPayload ?? null,
        shortCode,
        destinationUrl: destinationUrl ?? null,
        passwordHash,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxScans: maxScans ?? null,
        redirectRules: redirectRules ? JSON.stringify(redirectRules) : null,
        design: JSON.stringify(design),
        logoDataUrl: logoDataUrl ?? null,
        overlayDataUrl: overlayDataUrl ?? null,
        overlayOpacity: overlayOpacity ?? 40,
        folderId: folderId ?? null,
        tags: JSON.stringify(tags ?? []),
      },
    })
    return NextResponse.json({
      ...code,
      design: JSON.parse(code.design) as QrDesign,
      redirectRules: code.redirectRules ? (JSON.parse(code.redirectRules) as RedirectRule[]) : null,
      tags: JSON.parse(code.tags) as string[],
      expiresAt: code.expiresAt?.toISOString() ?? null,
      trashedAt: code.trashedAt?.toISOString() ?? null,
      createdAt: code.createdAt.toISOString(),
      updatedAt: code.updatedAt.toISOString(),
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create QR code.' }, { status: 500 })
  }
}
