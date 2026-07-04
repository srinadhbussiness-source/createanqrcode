
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

/**
 * GET /api/api-keys/usage
 *
 * Returns per-key usage stats for the API usage dashboard. Replaces the
 * previous static "60 req/min · 10,000/day" card with real numbers tracked
 * by the v1 API route (see src/app/api/v1/qr-codes/route.ts).
 *
 * Returns:
 *   { data: [{ id, name, apiRequests, lastResetAt, limit }], total, limit }
 *
 * `limit` is the documented per-period ceiling (10,000 requests/month for Pro
 * and Business). The endpoint is plan-gated (Pro+) — same as the rest of the
 * API keys surface.
 */
const USAGE_LIMIT = 10_000

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.plan === 'free' || session.user.plan === 'starter') {
    return NextResponse.json({ error: 'API access requires Pro plan or higher.' }, { status: 403 })
  }
  const keys = await db.apiKey.findMany({
    where: { userId: session.userId },
    orderBy: { apiRequests: 'desc' },
  })
  const total = keys.reduce((sum, k) => sum + k.apiRequests, 0)
  return NextResponse.json({
    data: keys.map((k) => ({
      id: k.id,
      name: k.name,
      apiRequests: k.apiRequests,
      lastResetAt: k.lastResetAt.toISOString(),
      lastUsed: k.lastUsed?.toISOString() ?? null,
    })),
    total,
    limit: USAGE_LIMIT,
  })
}
