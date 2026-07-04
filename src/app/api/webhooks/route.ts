
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const SUPPORTED_EVENTS = ['scan', 'created', 'expired'] as const
type SupportedEvent = typeof SUPPORTED_EVENTS[number]

const ALLOWED_PROTOCOLS = ['http:', 'https:']

function normalizeEvents(input: unknown): string {
  if (!Array.isArray(input)) return 'scan'
  const filtered = input
    .filter((e): e is SupportedEvent => typeof e === 'string' && (SUPPORTED_EVENTS as readonly string[]).includes(e))
  const unique = Array.from(new Set(filtered))
  return unique.length ? unique.join(',') : 'scan'
}

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).optional(),
  active: z.boolean().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const hooks = await db.webhook.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    data: hooks.map((h) => ({
      id: h.id,
      url: h.url,
      events: h.events,
      active: h.active,
      secret: h.secret,
      lastDeliveryAt: null, // MVP: not tracked yet
      createdAt: h.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid http(s) URL is required.' }, { status: 400 })
  }
  // Reject non-http(s) URLs to prevent SSRF via file:// / data: schemes.
  let parsedUrl: URL
  try {
    parsedUrl = new URL(parsed.data.url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 })
  }
  if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 })
  }
  const events = normalizeEvents(parsed.data.events ?? ['scan'])
  // 32-byte secret, base64 — used as the HMAC key for X-CreateAnQRCode-Signature.
  const secret = randomBytes(32).toString('hex')
  const created = await db.webhook.create({
    data: {
      userId: session.userId,
      url: parsedUrl.toString(),
      secret,
      events,
      active: parsed.data.active ?? true,
    },
  })
  return NextResponse.json({
    id: created.id,
    url: created.url,
    events: created.events,
    active: created.active,
    secret: created.secret,
    lastDeliveryAt: null,
    createdAt: created.createdAt.toISOString(),
  }, { status: 201 })
}
