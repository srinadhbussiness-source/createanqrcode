
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashApiKey, rateLimit, rateLimitHeaders } from '@/lib/auth'
import { generateShortCode } from '@/lib/format'
import type { QrDesign, QrTypeId } from '@/lib/types'

// Authenticate via API key
async function authApiKey(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const rawKey = auth.slice(7)
  const keyHash = hashApiKey(rawKey)
  const key = await db.apiKey.findUnique({ where: { keyHash }, include: { user: true } })
  if (!key) return null
  // Throttle the `lastUsed` + `apiRequests` hot writes: only persist when the
  // stored `lastUsed` value is >60s stale. High-traffic API consumers were
  // previously hitting the DB on every single request — we batch the counter
  // increment to the same 60s tick so the usage dashboard stays responsive
  // without melting the DB. Note: between two 60s ticks, we only count the
  // requests that hit the throttle window (one increment per tick). This
  // under-counts bursts, but gives a stable, low-write usage signal which is
  // good enough for the dashboard. To get exact counts we'd need a
  // Redis/stream + flush job — overkill for the MVP.
  const now = Date.now()
  const lastMs = key.lastUsed ? key.lastUsed.getTime() : 0
  if (now - lastMs > 60_000) {
    await db.apiKey.update({
      where: { id: key.id },
      data: {
        lastUsed: new Date(now),
        // Atomic increment (Prisma translates to SQL `SET apiRequests = apiRequests + 1`).
        apiRequests: { increment: 1 },
      },
    })
  }
  return { key, user: key.user }
}

// Real per-key rate limit: 60 req/min (documented in API docs).
const API_LIMIT = 60
const API_WINDOW = 60 * 1000

export async function GET(req: NextRequest) {
  const ctx = await authApiKey(req)
  if (!ctx) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key.' } }, { status: 401 })
  const rl = rateLimit(`api:${ctx.key.id}`, API_LIMIT, API_WINDOW)
  if (!rl.ok) {
    return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded. Retry after the reset.' } }, { status: 429, headers: rateLimitHeaders(rl) })
  }
  const page = Number(req.nextUrl.searchParams.get('page') ?? '1')
  const perPage = Math.min(Number(req.nextUrl.searchParams.get('per_page') ?? '20'), 100)
  const total = await db.qrCode.count({ where: { userId: ctx.user.id, trashed: false } })
  const codes = await db.qrCode.findMany({
    where: { userId: ctx.user.id, trashed: false },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * perPage, take: perPage,
  })
  return NextResponse.json({
    data: codes.map((c) => ({
      id: c.id, title: c.title, qr_type: c.qrType, is_dynamic: c.isDynamic,
      status: c.status, static_payload: c.staticPayload, destination_url: c.destinationUrl,
      short_code: c.shortCode, scan_count: c.scanCount,
      created_at: c.createdAt.toISOString(),
    })),
    pagination: { total, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(total / perPage)) },
  }, { headers: rateLimitHeaders(rl) })
}

export async function POST(req: NextRequest) {
  const ctx = await authApiKey(req)
  if (!ctx) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key.' } }, { status: 401 })
  const rl = rateLimit(`api:${ctx.key.id}`, API_LIMIT, API_WINDOW)
  if (!rl.ok) {
    return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded. Retry after the reset.' } }, { status: 429, headers: rateLimitHeaders(rl) })
  }
  if (!ctx.key.scopes.includes('write')) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'API key lacks write scope.' } }, { status: 403, headers: rateLimitHeaders(rl) })
  }
  const body = await req.json() as {
    title: string; qr_type: QrTypeId; is_dynamic?: boolean;
    static_payload?: string; destination_url?: string; design?: Partial<QrDesign>;
  }
  if (!body.title || !body.qr_type) {
    return NextResponse.json({ error: { code: 'INVALID', message: 'title and qr_type are required.' } }, { status: 400, headers: rateLimitHeaders(rl) })
  }
  const design: QrDesign = {
    fgColor: '#000000', bgColor: '#FFFFFF', transparentBg: false, dotStyle: 'square',
    eyeStyle: 'square', errorCorrection: 'M', outputSize: 512, gradientType: 'none',
    gradientStart: '#7C3AED', gradientEnd: '#EC4899', gradientAngle: 45, logoSize: 20, logoPadding: 5,
    ...body.design,
  }
  const code = await db.qrCode.create({
    data: {
      userId: ctx.user.id, title: body.title, qrType: body.qr_type,
      isDynamic: !!body.is_dynamic,
      staticPayload: body.static_payload ?? null,
      destinationUrl: body.destination_url ?? null,
      shortCode: body.is_dynamic ? generateShortCode() : null,
      design: JSON.stringify(design), tags: '[]',
    },
  })
  return NextResponse.json({
    id: code.id, title: code.title, qr_type: code.qrType, is_dynamic: code.isDynamic,
    status: code.status, static_payload: code.staticPayload, destination_url: code.destinationUrl,
    short_code: code.shortCode, scan_count: 0, created_at: code.createdAt.toISOString(),
  }, { status: 201, headers: rateLimitHeaders(rl) })
}
