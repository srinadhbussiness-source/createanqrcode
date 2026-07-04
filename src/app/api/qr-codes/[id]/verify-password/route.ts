
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, hashIp, rateLimit, rateLimitHeaders } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

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

// Brute-force protection for the QR password gate: 10 attempts per IP+QR per
// 10 minutes. The QR id is in the public gate HTML, so this is the only thing
// stopping scripted password guessing.
const PW_LIMIT = 10
const PW_WINDOW = 10 * 60 * 1000

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip') || 'unknown'
  const rl = rateLimit(`qrpw:${ip}:${id}`, PW_LIMIT, PW_WINDOW)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: rateLimitHeaders(rl) }
    )
  }
  let password: string
  try {
    ({ password } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: rateLimitHeaders(rl) })
  }
  const qr = await db.qrCode.findUnique({ where: { id } })
  if (!qr || !qr.passwordHash) {
    return NextResponse.json({ error: 'Not protected' }, { status: 400, headers: rateLimitHeaders(rl) })
  }
  const ok = await verifyPassword(password, qr.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401, headers: rateLimitHeaders(rl) })
  }
  // Success — this is the real "scan completion" for a protected QR. Log the
  // scan now (the /q/[code] GET deliberately skipped it so failed password
  // attempts don't inflate counts), respecting expiry/cap/paused/trashed.
  if (qr.status === 'active' && !qr.trashed && !qr.archived
      && (!qr.expiresAt || qr.expiresAt >= new Date())
      && (!qr.maxScans || qr.scanCount < qr.maxScans)) {
    const ua = req.headers.get('user-agent') ?? ''
    const { type, os, browser } = detectDevice(ua)
    const cc = req.headers.get('x-vercel-ip-country')
      || req.headers.get('cf-ipcountry')
      || req.headers.get('x-forwarded-for-country') || null
    const ref = req.headers.get('referer') || req.headers.get('referrer') || 'Direct / No referrer'
    const lang = req.headers.get('accept-language')?.split(',')[0] ?? null
    await db.scan.create({
      data: {
        qrCodeId: qr.id, countryCode: cc, countryName: cc ? (COUNTRY_BY_CODE[cc] ?? cc) : null,
        city: null, deviceType: type, os, browser, referrer: ref, language: lang,
        ipHash: hashIp(ip === 'unknown' ? null : ip),
      },
    })
    await db.qrCode.update({ where: { id: qr.id }, data: { scanCount: { increment: 1 } } })
  }
  // Resolve redirect rules for the destination (mirror /q/[code] logic).
  let destination = qr.destinationUrl ?? ''
  if (qr.redirectRules) {
    try {
      const { type } = detectDevice(req.headers.get('user-agent') ?? '')
      const cc = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || null
      const rules = JSON.parse(qr.redirectRules) as Array<{ type: string; value: string; destination: string }>
      for (const r of rules) {
        const v = r.value.toLowerCase()
        if (r.type === 'device' && v === type.toLowerCase()) { destination = r.destination; break }
        if (r.type === 'country' && v === (cc ?? '').toLowerCase()) { destination = r.destination; break }
      }
    } catch { /* ignore */ }
  }
  return NextResponse.json({ destination }, { headers: rateLimitHeaders(rl) })
}
