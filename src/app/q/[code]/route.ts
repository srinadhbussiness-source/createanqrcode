
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashIp, rateLimit, rateLimitHeaders } from '@/lib/auth'
import { broadcastScan } from '@/lib/supabase-client'
import { dispatchWebhook } from '@/lib/webhook-dispatch'

const COUNTRY_BY_CODE: Record<string, string> = {
  IN: 'India', US: 'USA', GB: 'UK', DE: 'Germany', AE: 'UAE', CA: 'Canada',
  AU: 'Australia', SG: 'Singapore', JP: 'Japan', FR: 'France',
}

function detectDevice(ua: string): { type: string; os: string; browser: string } {
  const type = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Desktop'
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iOS'
    : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : 'Linux'
  const browser = /Edg/i.test(ua) ? 'Edge' : /Chrome/i.test(ua) ? 'Chrome'
    : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Other'
  return { type, os, browser }
}

// Light rate limit on scan logging to prevent trivial scan-count inflation
// via replay. 30 scans per IP per minute is generous for a real human but
// blocks scripted inflation.
const SCAN_LIMIT = 30
const SCAN_WINDOW = 60 * 1000

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const qr = await db.qrCode.findFirst({ where: { shortCode: code } })
  if (!qr) {
    return new NextResponse(renderPage('QR Code Not Found', 'This QR code does not exist or has been deleted.', false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }
  // SECURITY: reject trashed & archived codes — they're hidden from the
  // dashboard but previously still redirected publicly.
  if (qr.trashed || qr.status === 'trashed') {
    return new NextResponse(renderPage('QR Code Removed', 'This QR code has been removed.', false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }
  if (qr.archived || qr.status === 'archived') {
    return new NextResponse(renderPage('QR Code Archived', 'This QR code has been archived and is no longer active.', false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }
  if (qr.status === 'paused') {
    return new NextResponse(renderPage('QR Code Paused', 'This QR code is temporarily paused. It is not currently active.', false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }
  if (qr.activatesAt && qr.activatesAt > new Date()) {
    const when = qr.activatesAt.toLocaleString()
    return new NextResponse(renderPage('Not Yet Active', `This QR code is scheduled to go live on ${when}. Please check back later.`, false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }
  if (qr.expiresAt && qr.expiresAt < new Date()) {
    return new NextResponse(renderPage('QR Code Expired', 'This QR code has expired.', false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }
  if (qr.maxScans && qr.scanCount >= qr.maxScans) {
    return new NextResponse(renderPage('Scan Limit Reached', 'This QR code has reached its scan limit.', false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Resolve destination (redirect rules, Pro+) — needed by both the password
  // gate (verify-password returns it) and the final redirect.
  const ua = req.headers.get('user-agent') ?? ''
  const { type, os, browser } = detectDevice(ua)
  // Normalize the country code to uppercase — different proxies/CDNs send
  // mixed-case values (Vercel sends "IN", Caddy may send "in"). This makes the
  // COUNTRY_BY_CODE lookup reliable AND keeps redirect-rule country matching
  // case-insensitive (both sides lowercased below).
  const rawCc = req.headers.get('x-vercel-ip-country')
    || req.headers.get('cf-ipcountry')
    || req.headers.get('x-forwarded-for-country') // Caddy can set this
    || null
  const cc = rawCc ? rawCc.toUpperCase() : null
  const countryName = cc ? (COUNTRY_BY_CODE[cc] ?? cc) : null
  // City detection from IP geo headers (used for geofencing redirect rules +
  // stored on the Scan row for analytics). Vercel: x-vercel-ip-city.
  // Cloudflare: cf-ipcity. Caddy can set x-forwarded-for-city.
  const scanCity = req.headers.get('x-vercel-ip-city')
    || req.headers.get('cf-ipcity')
    || req.headers.get('x-forwarded-for-city')
    || null
  let destination = qr.destinationUrl ?? ''
  if (qr.redirectRules) {
    try {
      const rules = JSON.parse(qr.redirectRules) as Array<{ type: string; value: string; destination: string }>
      for (const r of rules) {
        // All rule matches are case-insensitive: rule value and the
        // request-side value are both lowercased before comparison.
        const v = r.value.toLowerCase()
        if (r.type === 'device' && v === type.toLowerCase()) { destination = r.destination; break }
        if (r.type === 'country' && v === (cc ?? '').toLowerCase()) { destination = r.destination; break }
        // Geofencing: city-based redirect. The scan log stores the city (from
        // the IP geo headers); match case-insensitively. E.g. "Mumbai" → mobile landing.
        if (r.type === 'city' && scanCity && v === scanCity.toLowerCase()) { destination = r.destination; break }
        // OS-based redirect: "android", "ios", "windows", "macos", "linux".
        if (r.type === 'os' && v === os.toLowerCase()) { destination = r.destination; break }
        // Browser-based redirect: "chrome", "safari", "firefox", "edge".
        if (r.type === 'browser' && v === browser.toLowerCase()) { destination = r.destination; break }
      }
    } catch { /* ignore */ }
  }

  // Password protection — render the gate WITHOUT logging a scan. The scan is
  // only counted once the visitor enters the correct password (handled by the
  // verify-password route's success path, OR we re-log here on redirect).
  if (qr.passwordHash) {
    return new NextResponse(renderGate(qr.id), { headers: { 'Content-Type': 'text/html' } })
  }

  if (!destination) {
    return new NextResponse(renderPage('No Destination', 'This QR code has no destination set.', false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Rate-limit scan logging to block scripted inflation. A real scan still
  // redirects even if rate-limited (we don't want to break the visitor's flow),
  // but we stop recording further Scan rows / incrementing the count.
  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip') || null
  const rl = rateLimit(`scan:${rawIp || 'unknown'}:${qr.id}`, SCAN_LIMIT, SCAN_WINDOW)
  if (rl.ok) {
    const ref = req.headers.get('referer') || req.headers.get('referrer') || 'Direct / No referrer'
    const lang = req.headers.get('accept-language')?.split(',')[0] ?? null
    const scan = await db.scan.create({
      data: {
        qrCodeId: qr.id, countryCode: cc, countryName,
        city: scanCity, deviceType: type, os, browser, referrer: ref, language: lang,
        ipHash: hashIp(rawIp),
      },
    })
    await db.qrCode.update({ where: { id: qr.id }, data: { scanCount: { increment: 1 } } })
    // Broadcast to Supabase for real-time analytics (no-op if not configured)
    void broadcastScan({
      id: scan.id, qrCodeId: qr.id, countryCode: cc, countryName,
      deviceType: type, os, browser, scannedAt: scan.scannedAt.toISOString(),
    })
    // Fire-and-forget outbound webhook delivery. Any delivery failures are
    // caught inside dispatchWebhook so they never break the scan flow.
    void dispatchWebhook(qr.userId, 'scan', {
      qrId: qr.id,
      qrTitle: qr.title,
      scanCount: qr.scanCount + 1,
      country: countryName,
      countryCode: cc,
      device: type,
      os,
      browser,
      scannedAt: scan.scannedAt.toISOString(),
    })
  }

  return NextResponse.redirect(destination, { status: 302 })
}

function renderPage(title: string, message: string, _ok: boolean) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
  <style>
    body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#fafafa;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:1rem}
    .card{max-width:420px;text-align:center;padding:2.5rem 2rem;background:#111;border:1px solid #222;border-radius:16px}
    .icon{font-size:3rem;margin-bottom:1rem}
    h1{font-size:1.5rem;margin:0 0 .5rem}
    p{color:#a1a1aa;margin:0 0 1.5rem;line-height:1.5}
    .brand{margin-top:1.5rem;font-size:.8rem;color:#71717a}
  </style></head><body>
  <div class="card"><div class="icon">⚠️</div><h1>${title}</h1><p>${message}</p>
  <div class="brand">Created with CreateAnQRCode</div></div></body></html>`
}

function renderGate(qrId: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Password Protected</title>
  <style>
    body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#fafafa;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:1rem}
    .card{max-width:420px;width:100%;text-align:center;padding:2.5rem 2rem;background:#111;border:1px solid #222;border-radius:16px}
    .icon{font-size:3rem;margin-bottom:1rem}
    h1{font-size:1.5rem;margin:0 0 .5rem}
    p{color:#a1a1aa;margin:0 0 1.5rem;line-height:1.5}
    input{width:100%;padding:.75rem 1rem;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;color:#fafafa;font-size:1rem;margin-bottom:1rem;box-sizing:border-box}
    button{width:100%;padding:.75rem 1rem;background:#7C3AED;color:#fff;border:0;border-radius:8px;font-size:1rem;cursor:pointer;font-weight:600}
    .brand{margin-top:1.5rem;font-size:.8rem;color:#71717a}
  </style></head><body>
  <div class="card"><div class="icon">🔒</div><h1>Password Protected</h1><p>This content is password protected. Enter the password to continue.</p>
  <input id="pw" type="password" placeholder="Password">
  <button onclick="check()">Continue →</button>
  <div class="brand">This QR code was created with CreateAnQRCode</div></div>
  <script>
    async function check(){
      const pw=document.getElementById('pw').value;
      const r=await fetch('/api/qr-codes/${qrId}/verify-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
      if(r.ok){const d=await r.json();location.href=d.destination;}
      else{alert('Incorrect password');}
    }
  </script></body></html>`
}
