import { createHmac } from 'crypto'
import { db } from './db'

const WEBHOOK_TIMEOUT_MS = 5000

/**
 * Dispatch an event to all of a user's active webhooks that subscribe to it.
 *
 * Each delivery is best-effort: failures (network errors, non-2xx responses,
 * timeouts) are caught and logged to console.error but never re-thrown — a
 * webhook outage must NOT break the scan flow or any other code path that
 * calls this function. Callers should always invoke this fire-and-forget
 * via `void dispatchWebhook(...)` so the awaited promise can run in the
 * background.
 *
 * The request body is JSON.stringify(payload). The signature header
 * `X-CreateAnQRCode-Signature` is `hex(hmacSHA256(secret, body))` so the
 * receiving service can verify authenticity by recomputing the HMAC.
 */
export async function dispatchWebhook(
  userId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  let hooks
  try {
    hooks = await db.webhook.findMany({ where: { userId, active: true } })
  } catch {
    // DB failure: nothing we can do — bail silently.
    return
  }
  const body = JSON.stringify({
    event,
    deliveredAt: new Date().toISOString(),
    data: payload,
  })
  await Promise.all(
    hooks
      .filter((h) => {
        const events = (h.events || 'scan').split(',').map((s) => s.trim()).filter(Boolean)
        return events.length === 0 || events.includes(event)
      })
      .map(async (h) => {
        const signature = createHmac('sha256', h.secret).update(body).digest('hex')
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)
        try {
          const res = await fetch(h.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CreateAnQRCode-Signature': signature,
              'X-CreateAnQRCode-Event': event,
              'User-Agent': 'CreateAnQRCode-Webhooks/1.0',
            },
            body,
            signal: controller.signal,
            // Don't follow redirects — a misconfigured webhook could otherwise
            // leak signed payloads to an attacker-controlled host.
            redirect: 'error',
          })
          if (!res.ok) {
            console.error(`[webhook] ${h.id} → ${h.url} returned ${res.status}`)
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[webhook] ${h.id} → ${h.url} failed: ${msg}`)
        } finally {
          clearTimeout(timeout)
        }
      }),
  )
}
