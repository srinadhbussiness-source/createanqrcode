import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { cookies } from 'next/headers'
import type { UserRecord, Plan } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Password hashing — bcrypt (replaces insecure single-pass SHA-256).
// Cost 12 is a good balance for 2025 (~250ms/hash, hard to brute-force).
// ─────────────────────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false
  // Legacy SHA-256 hashes (pre-hardening) look like "salt:hash" — reject them
  // so old accounts must reset their password. bcrypt hashes start with "$2".
  if (!stored.startsWith('$2')) return false
  try {
    return await bcrypt.compare(password, stored)
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API key hashing — SHA-256 is fine here (keys are high-entropy, 32 bytes).
// ─────────────────────────────────────────────────────────────────────────────
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export function generateVerifyToken(): string {
  return randomBytes(16).toString('hex')
}

// ─────────────────────────────────────────────────────────────────────────────
// IP hashing with a DAILY SALT — the spec's "architectural guarantee" that raw
// IPs are never stored. SHA-256(ip + dailySalt) lets us dedupe unique visitors
// within a day without keeping the IP. The salt rotates at UTC midnight so a
// leaked DB can't be rainbow-tabled against a fixed salt.
// ─────────────────────────────────────────────────────────────────────────────
function dailySalt(): string {
  const d = new Date()
  const dayKey = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`
  return createHash('sha256').update(`caqr-ip-salt-${dayKey}`).digest('hex')
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null
  // Strip any port and normalize; take the first IP from an XFF chain.
  const clean = ip.split(',')[0].trim().replace(/^::ffff:/, '')
  if (!clean) return null
  return createHash('sha256').update(clean + ':' + dailySalt()).digest('hex')
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting — in-memory sliding window per key. Good enough for a
// single-instance deployment; for multi-instance, swap for Redis. Returns
// { ok, remaining, resetAt } so routes can emit standard rate-limit headers.
// ─────────────────────────────────────────────────────────────────────────────
interface RateBucket { count: number; resetAt: number }
const rateStore = new Map<string, RateBucket>()

export interface RateLimitResult { ok: boolean; remaining: number; resetAt: number; limit: number }

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = rateStore.get(key)
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs
    rateStore.set(key, { count: 1, resetAt })
    return { ok: true, remaining: limit - 1, resetAt, limit }
  }
  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt, limit }
  }
  bucket.count++
  return { ok: true, remaining: limit - bucket.count, resetAt: bucket.resetAt, limit }
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(Math.max(0, r.remaining)),
    'X-RateLimit-Reset': String(Math.floor(r.resetAt / 1000)),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────────────────────────────────────
export async function getSession(): Promise<{ user: UserRecord; userId: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('caqr-token')?.value
  if (!token) return null
  const session = await db.session.findFirst({
    where: { token },
  })
  if (!session) return null
  const u = session.user
  if (!u) return null
  const user: UserRecord = {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    plan: u.plan as Plan,
    trialEndsAt: typeof u.trialEndsAt === 'string' ? u.trialEndsAt : u.trialEndsAt?.toISOString?.() ?? null,
    timezone: u.timezone,
    dateFormat: u.dateFormat,
    emailVerified: u.emailVerified,
    notifSecurity: u.notifSecurity,
    notifTrial: u.notifTrial,
    notifScans: u.notifScans,
    notifExpiry: u.notifExpiry,
    notifDigest: u.notifDigest,
    notifUpdates: u.notifUpdates,
    role: (u.role as 'user' | 'admin' | 'superadmin') || 'user',
    suspended: u.suspended ?? false,
    twoFactorEnabled: u.twoFactorEnabled ?? false,
    createdAt: typeof u.createdAt === 'string' ? u.createdAt : u.createdAt?.toISOString?.() ?? new Date().toISOString(),
  }
  return { user, userId: u.id }
}

/** Admin-only session: returns session only if the user has admin/superadmin role and isn't suspended. */
export async function getAdminSession(): Promise<{ user: UserRecord; userId: string } | null> {
  const session = await getSession()
  if (!session) return null
  if (session.user.suspended) return null
  if (session.user.role !== 'admin' && session.user.role !== 'superadmin') return null
  return session
}

/** Write an immutable audit-log entry. Safe to fire-and-forget. */
export async function auditLog(opts: {
  actorId?: string | null
  actorEmail?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  metadata?: Record<string, unknown> | null
  ip?: string | null
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: opts.actorId ?? null,
        actorEmail: opts.actorEmail ?? null,
        action: opts.action,
        targetType: opts.targetType ?? null,
        targetId: opts.targetId ?? null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
        ip: opts.ip ?? null,
      },
    })
  } catch {
    // Audit logging must never break the request flow.
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken()
  await db.session.create({ data: { userId, token, current: true } })
  return token
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('caqr-token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 10, // 10 days
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('caqr-token')
}

/** Revoke a session by token (used by logout + revoke-all). Returns true if deleted. */
export async function revokeSession(token: string): Promise<boolean> {
  try {
    await db.session.delete({ where: { token } })
    return true
  } catch {
    return false
  }
}
