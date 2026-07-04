
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

function detectDevice(ua: string): { device: string | null; browser: string | null } {
  if (!ua) return { device: null, browser: null }
  const device = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Desktop'
  const browser = /Edg/i.test(ua) ? 'Edge' : /Chrome/i.test(ua) ? 'Chrome'
    : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Other'
  return { device, browser }
}

/** GET /api/sessions — list the current user's active sessions (newest first). */
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ua = req.headers.get('user-agent') ?? ''
  const me = detectDevice(ua)
  const rows = await db.session.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  // Enrich: infer device/browser from the UA of THIS request for the current
  // session (we don't store UA per session). Other sessions show stored fields.
  return NextResponse.json({
    data: rows.map((s) => ({
      id: s.id,
      device: s.current ? me.device : (s.device ?? null),
      browser: s.current ? me.browser : (s.browser ?? null),
      country: s.country ?? null,
      current: s.current,
      createdAt: s.createdAt.toISOString(),
    })),
  })
}
