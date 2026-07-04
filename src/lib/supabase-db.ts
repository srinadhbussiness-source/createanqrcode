/**
 * Supabase-based data layer for Cloudflare Pages (edge runtime).
 *
 * Prisma doesn't work on Cloudflare's edge runtime, so this module provides
 * the same database operations using the Supabase REST API (PostgREST).
 * It's used when running on Cloudflare; the local dev environment still
 * uses Prisma + SQLite via src/lib/db.ts.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  _client = createClient(url, key, { auth: { persistSession: false } })
  return _client
}

export const supabaseDb = {
  // ── User operations ──
  async findUserByEmail(email: string) {
    const sb = getClient()
    const { data } = await sb.from('User').select('*').eq('email', email).single()
    return data
  },

  async findUserById(id: string) {
    const sb = getClient()
    const { data } = await sb.from('User').select('*').eq('id', id).single()
    return data
  },

  async createUser(data: {
    id: string; email: string; name: string | null; passwordHash: string;
    plan: string; timezone: string; dateFormat: string;
    notifSecurity: boolean; notifTrial: boolean; notifScans: boolean;
    notifExpiry: boolean; notifDigest: boolean; notifUpdates: boolean;
    emailVerified: boolean; verifyToken: string | null; verifyTokenExp: string | null;
  }) {
    const sb = getClient()
    const { data: user, error } = await sb.from('User').insert(data).select().single()
    if (error) throw error
    return user
  },

  async updateUser(id: string, patch: Record<string, unknown>) {
    const sb = getClient()
    const { data, error } = await sb.from('User').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  // ── Session operations ──
  async createSession(data: { id: string; userId: string; token: string; device: string | null; browser: string | null; country: string | null; twoFactorPending?: boolean }) {
    const sb = getClient()
    const { data: session, error } = await sb.from('Session').insert(data).select().single()
    if (error) throw error
    return session
  },

  async findSessionByToken(token: string) {
    const sb = getClient()
    const { data } = await sb.from('Session').select('*, User(*)').eq('token', token).single()
    return data
  },

  async deleteSession(token: string) {
    const sb = getClient()
    await sb.from('Session').delete().eq('token', token)
  },

  async deleteSessionsByUserId(userId: string, exceptToken?: string) {
    const sb = getClient()
    let q = sb.from('Session').delete().eq('userId', userId)
    if (exceptToken) q = q.neq('token', exceptToken)
    await q
  },

  // ── QR Code operations ──
  async findQrCodesByUserId(userId: string) {
    const sb = getClient()
    const { data } = await sb.from('QrCode').select('*').eq('userId', userId).eq('trashed', false).order('updatedAt', { ascending: false })
    return data || []
  },

  async findQrCodeById(id: string, userId: string) {
    const sb = getClient()
    const { data } = await sb.from('QrCode').select('*').eq('id', id).eq('userId', userId).single()
    return data
  },

  async findQrCodeByShortCode(shortCode: string) {
    const sb = getClient()
    const { data } = await sb.from('QrCode').select('*').eq('shortCode', shortCode).single()
    return data
  },

  async createQrCode(data: Record<string, unknown>) {
    const sb = getClient()
    const { data: qr, error } = await sb.from('QrCode').insert(data).select().single()
    if (error) throw error
    return qr
  },

  async updateQrCode(id: string, patch: Record<string, unknown>) {
    const sb = getClient()
    const { data, error } = await sb.from('QrCode').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async deleteQrCode(id: string) {
    const sb = getClient()
    await sb.from('QrCode').delete().eq('id', id)
  },

  async countDynamicQrCodes(userId: string) {
    const sb = getClient()
    const { count } = await sb.from('QrCode').select('*', { count: 'exact', head: true }).eq('userId', userId).eq('isDynamic', true)
    return count || 0
  },

  // ── Scan operations ──
  async createScan(data: Record<string, unknown>) {
    const sb = getClient()
    await sb.from('Scan').insert(data)
  },

  async findScansByQrCodeId(qrCodeId: string, limit = 500) {
    const sb = getClient()
    const { data } = await sb.from('Scan').select('*').eq('qrCodeId', qrCodeId).order('scannedAt', { ascending: false }).limit(limit)
    return data || []
  },

  // ── Folder operations ──
  async findFoldersByUserId(userId: string) {
    const sb = getClient()
    const { data } = await sb.from('Folder').select('*').eq('userId', userId).order('createdAt', { ascending: true })
    return data || []
  },

  // ── Template operations ──
  async findTemplates(userId: string | null) {
    const sb = getClient()
    const { data } = await sb.from('Template').select('*').or(`userId.is.null,userId.eq.${userId}`).order('createdAt', { ascending: false })
    return data || []
  },

  // ── API Key operations ──
  async findApiKeysByUserId(userId: string) {
    const sb = getClient()
    const { data } = await sb.from('ApiKey').select('*').eq('userId', userId).order('createdAt', { ascending: false })
    return data || []
  },

  async findApiKeyByHash(keyHash: string) {
    const sb = getClient()
    const { data } = await sb.from('ApiKey').select('*, User(*)').eq('keyHash', keyHash).single()
    return data
  },

  // ── Webhook operations ──
  async findWebhooksByUserId(userId: string) {
    const sb = getClient()
    const { data } = await sb.from('Webhook').select('*').eq('userId', userId).order('createdAt', { ascending: false })
    return data || []
  },

  async createWebhook(data: Record<string, unknown>) {
    const sb = getClient()
    const { data: webhook, error } = await sb.from('Webhook').insert(data).select().single()
    if (error) throw error
    return webhook
  },

  // ── Payment operations ──
  async findPaymentsByUserId(userId: string) {
    const sb = getClient()
    const { data } = await sb.from('Payment').select('*').eq('userId', userId).order('createdAt', { ascending: false })
    return data || []
  },
}
