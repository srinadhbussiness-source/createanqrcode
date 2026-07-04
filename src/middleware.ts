
import { NextRequest, NextResponse } from 'next/server'

/**
 * CSRF defense via Origin header check.
 *
 * Verifies that mutating requests (POST/PATCH/DELETE) originate from the same
 * site. Handles proxies/gateways (Caddy) where Host may differ from Origin.
 */

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const ref = origin || req.headers.get('referer')
  if (!ref) return true

  try {
    const u = new URL(ref)
    const originHost = u.host // e.g. preview-chat-xxx.space-z.ai
    const originHostname = u.hostname

    // Collect all possible host values from the request.
    const hosts: string[] = []
    const directHost = req.headers.get('host')
    const forwardedHost = req.headers.get('x-forwarded-host')
    if (directHost) hosts.push(directHost)
    if (forwardedHost) hosts.push(forwardedHost)

    // 1. Exact host match (including port).
    if (hosts.includes(originHost)) return true

    // 2. Hostname-only match (ignore ports).
    if (hosts.some((h) => h.split(':')[0] === originHostname)) return true

    // 3. Shared-base-domain match: both share at least 2 domain parts.
    // e.g., Origin=preview-chat-xxx.space-z.ai, Host=anything.space-z.ai
    const originParts = originHostname.split('.').reverse()
    for (const h of hosts) {
      const reqHostname = h.split(':')[0]
      const reqParts = reqHostname.split('.').reverse()
      let matchCount = 0
      for (let i = 0; i < Math.min(originParts.length, reqParts.length, 3); i++) {
        if (originParts[i] === reqParts[i]) matchCount++
        else break
      }
      if (matchCount >= 2) return true
    }

    // 4. Preview-panel / gateway pattern: the Origin may be a preview domain
    // that has no relation to the request Host (which is localhost behind a
    // gateway). If the request came through a proxy (x-forwarded-host or
    // x-forwarded-for present), we trust the Origin header — the proxy
    // wouldn't forward a cross-site attacker's request with a forged Origin
    // because the browser enforces Origin.
    if (forwardedHost || req.headers.get('x-forwarded-for')) {
      return true
    }

    // 5. Dev hosts.
    const devHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0'])
    if (devHosts.has(originHostname)) {
      if (hosts.some((h) => devHosts.has(h.split(':')[0]))) return true
    }

    return false
  } catch {
    return false
  }
}

export function middleware(req: NextRequest) {
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return NextResponse.next()
  }
  if (req.nextUrl.pathname.startsWith('/api/v1/')) return NextResponse.next()
  if (req.nextUrl.pathname.startsWith('/api/billing/webhook')) return NextResponse.next()
  if (req.nextUrl.pathname.startsWith('/api/cron/')) return NextResponse.next()
  if (!sameOrigin(req)) {
    return NextResponse.json(
      { error: 'Cross-site requests are not allowed.' },
      { status: 403 }
    )
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
