import { Resend } from 'resend'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'

// Lazy-init: only instantiate the Resend client when we actually need to send
// AND an API key is configured. Without this guard, `new Resend(undefined)`
// throws at module-load time and crashes every route that imports this module
// (signup, reset-request, etc.) in dev environments where RESEND_API_KEY isn't set.
let _resend: Resend | null = null
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!_resend) _resend = new Resend(key)
  return _resend
}

// Resend's test sender — works immediately without domain verification.
// Replace with a verified domain sender (e.g. noreply@createanqrcode.com)
// once the domain is verified in the Resend dashboard.
const FROM = 'CreateAnQRCode <onboarding@resend.dev>'

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const client = getResend()
  // No API key configured → stub: log to console + append to download/emails.log
  // so verification / reset tokens are still inspectable in dev.
  if (!client) {
    const line = `[${new Date().toISOString()}] TO: ${payload.to} | SUBJECT: ${payload.subject}\n${payload.text}\n${'─'.repeat(80)}\n`
    console.log(`📧 (stub) email → ${payload.to}: ${payload.subject}`)
    try {
      const logPath = join(process.cwd(), 'download', 'emails.log')
      mkdirSync(dirname(logPath), { recursive: true })
      writeFileSync(logPath, line, { flag: 'a' })
    } catch {
      // best-effort — don't let logging crash the request
    }
    return
  }
  try {
    const { error } = await client.emails.send({
      from: FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })
    if (error) {
      console.error('📧 email send failed:', error.message)
    } else {
      console.log(`📧 email sent → ${payload.to}: ${payload.subject}`)
    }
  } catch (err) {
    console.error('📧 email exception:', err)
  }
}

/**
 * Derive the site base URL for email links.
 * Priority: NEXT_PUBLIC_SITE_URL env → request Origin header → request Host header.
 * This makes it work on any deployment (localhost, preview panel, production domain)
 * without hardcoding.
 */
export function getBaseUrl(req?: Request): string {
  // 1. Env var (set in production)
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  // 2. Request Origin header (most reliable for server-side)
  if (req) {
    const origin = req.headers.get('origin')
    if (origin) return origin
    const host = req.headers.get('host')
    const proto = host?.includes('localhost') ? 'http' : 'https'
    if (host) return `${proto}://${host}`
  }
  // 3. Fallback (should rarely hit this)
  return 'https://createanqrcode.com'
}

/** Build the verification email with a magic link. */
export function verificationEmail(to: string, token: string, base = 'https://createanqrcode.com'): EmailPayload {
  const link = `${base}/verify-email?token=${token}`
  return {
    to,
    subject: 'Verify your CreateAnQRCode email',
    text: `Welcome to CreateAnQRCode! Click the link to verify your email: ${link}\n\nThis link expires in 24 hours. If you didn't sign up, you can ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2>Welcome to CreateAnQRCode!</h2>
      <p>Click the button below to verify your email address:</p>
      <p style="margin:24px 0">
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#0a0a0a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Verify email</a>
      </p>
      <p style="color:#71717a;font-size:13px">Or paste this link: ${link}</p>
      <p style="color:#71717a;font-size:13px">This link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>
    </div>`,
  }
}

/** Build the password-reset email with a magic link. */
export function resetEmail(to: string, token: string, base = 'https://createanqrcode.com'): EmailPayload {
  const link = `${base}/update-password?token=${token}`
  return {
    to,
    subject: 'Reset your CreateAnQRCode password',
    text: `We received a password reset request. Click the link to set a new password: ${link}\n\nThis link expires in 1 hour. If you didn't request a reset, ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2>Reset your password</h2>
      <p>Click the button below to set a new password:</p>
      <p style="margin:24px 0">
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#0a0a0a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset password</a>
      </p>
      <p style="color:#71717a;font-size:13px">Or paste this link: ${link}</p>
      <p style="color:#71717a;font-size:13px">This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>
    </div>`,
  }
}

/** Generic transactional email builder for notifications. */
export function notificationEmail(to: string, subject: string, body: string): EmailPayload {
  return {
    to,
    subject,
    text: body,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px"><p>${body}</p></div>`,
  }
}
