
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
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

const patchSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  active: z.boolean().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // Ownership check: only the owner can edit their webhook.
  const existing = await db.webhook.findFirst({ where: { id, userId: session.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const data: Record<string, unknown> = {}
  if (typeof parsed.data.url === 'string') {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(parsed.data.url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 })
    }
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 })
    }
    data['url'] = parsedUrl.toString()
  }
  if (Array.isArray(parsed.data.events)) {
    data['events'] = normalizeEvents(parsed.data.events)
  }
  if (typeof parsed.data.active === 'boolean') {
    data['active'] = parsed.data.active
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No updatable fields supplied.' }, { status: 400 })
  }
  const updated = await db.webhook.update({ where: { id }, data })
  return NextResponse.json({
    id: updated.id,
    url: updated.url,
    events: updated.events,
    active: updated.active,
    secret: updated.secret,
    lastDeliveryAt: null,
    createdAt: updated.createdAt.toISOString(),
  })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.webhook.findFirst({ where: { id, userId: session.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.webhook.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
