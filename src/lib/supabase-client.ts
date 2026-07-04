import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser-safe Supabase client using the publishable key.
 * Used for Realtime subscriptions (scan feed) — no service-role secrets.
 */
let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null // server-side: use getSupabaseServer
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    console.warn('Supabase env vars not set — realtime disabled')
    return null
  }

  client = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } },
  })
  return client
}

/**
 * Server-side Supabase client using the service-role key.
 * Used for writing scan events to Supabase from the scan-redirect route.
 */
let serverClient: SupabaseClient | null = null

export function getSupabaseServer(): SupabaseClient | null {
  if (serverClient) return serverClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return null
  }

  serverClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return serverClient
}

/**
 * Broadcast a scan event to Supabase for real-time analytics.
 * Called from the scan-redirect route after logging to SQLite.
 * Safe to call even if Supabase isn't configured (no-op).
 */
export async function broadcastScan(scan: {
  id: string
  qrCodeId: string
  countryCode: string | null
  countryName: string | null
  deviceType: string | null
  os: string | null
  browser: string | null
  scannedAt: string
}): Promise<void> {
  const sb = getSupabaseServer()
  if (!sb) return // Supabase not configured — silently skip

  try {
    await sb.from('scans').insert({
      id: scan.id,
      qr_code_id: scan.qrCodeId,
      country_code: scan.countryCode,
      country_name: scan.countryName,
      device_type: scan.deviceType,
      os: scan.os,
      browser: scan.browser,
      scanned_at: scan.scannedAt,
    })
  } catch (err) {
    // Don't let Supabase errors break the scan flow
    console.warn('Supabase broadcast failed:', err)
  }
}
