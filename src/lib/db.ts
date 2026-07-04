/**
 * Database client — uses Supabase REST API (PostgREST) for all data operations.
 *
 * This replaces Prisma ORM so the app works on both local dev AND Cloudflare
 * Pages (edge runtime) without needing a direct PostgreSQL connection.
 *
 * The Supabase service role key bypasses RLS, so all CRUD operations work
 * server-side without additional auth.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  _client = createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'createanqrcode' } },
  })
  return _client
}

// Helper: convert snake_case DB row to camelCase + parse JSON fields
function parseRow(row: Record<string, unknown> | null, jsonFields: string[] = []): Record<string, unknown> | null {
  if (!row) return null
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (jsonFields.includes(key) && typeof value === 'string') {
      try { result[key] = JSON.parse(value) } catch { result[key] = value }
    } else {
      result[key] = value
    }
  }
  return result
}

// Helper: serialize Date objects to ISO strings for Supabase REST API
function serializeData(data: Record<string, unknown>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      serialized[key] = value.toISOString()
    } else {
      serialized[key] = value
    }
  }
  // Auto-generate ID if not provided (Prisma's @default(cuid()) replacement)
  if (!serialized.id) {
    serialized.id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  }
  return serialized
}

export const db = {
  // ── User ──
  user: {
    async findUnique({ where, select }: { where: { id?: string; email?: string }; select?: Record<string, boolean> }) {
      const sb = getClient()
      let query = sb.from('User').select('*')
      if (where.id) query = query.eq('id', where.id)
      if (where.email) query = query.eq('email', where.email)
      const { data } = await query.single()
      return parseRow(data) as any
    },
    async findFirst({ where }: { where: Record<string, unknown> }) {
      const sb = getClient()
      let query = sb.from('User').select('*')
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value)
      }
      const { data } = await query.limit(1).maybeSingle()
      return parseRow(data) as any
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const sb = getClient()
      const { data: result } = await sb.from('User').insert(serializeData(data)).select().single()
      return parseRow(result) as any
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const sb = getClient()
      const { data: result } = await sb.from('User').update(serializeData(data)).eq('id', where.id).select().single()
      return parseRow(result) as any
    },
    async count({ where }: { where: Record<string, unknown> }) {
      const sb = getClient()
      let query = sb.from('User').select('*', { count: 'exact', head: true })
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value)
      }
      const { count } = await query
      return count ?? 0
    },
  },

  // ── Session ──
  session: {
    async findFirst({ where }: { where: Record<string, unknown> }) {
      const sb = getClient()
      let query = sb.from('Session').select('*, User(*)')
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value)
      }
      const { data } = await query.limit(1).maybeSingle()
      if (!data) return null
      const user = data.User
      delete data.User
      return { ...parseRow(data), user: parseRow(user) } as any
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const sb = getClient()
      const { data: result } = await sb.from('Session').insert(serializeData(data)).select().single()
      return parseRow(result) as any
    },
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      const sb = getClient()
      let query = sb.from('Session').delete()
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value)
      }
      await query
    },
    async delete({ where }: { where: { token: string } }) {
      const sb = getClient()
      await sb.from('Session').delete().eq('token', where.token)
    },
  },

  // ── QrCode ──
  qrCode: {
    async findMany({ where, orderBy, take }: { where?: Record<string, unknown>; orderBy?: { updatedAt?: 'desc' }; take?: number }) {
      const sb = getClient()
      let query = sb.from('QrCode').select('*')
      if (where) for (const [key, value] of Object.entries(where)) {
        if (value === null) query = query.is(key, null)
        else query = query.eq(key, value)
      }
      if (orderBy?.updatedAt === 'desc') query = query.order('updatedAt', { ascending: false })
      if (take) query = query.limit(take)
      const { data } = await query
      return (data || []).map(r => parseRow(r, ['design', 'redirectRules', 'tags'])) as any[]
    },
    async findFirst({ where }: { where: Record<string, unknown> }) {
      const sb = getClient()
      let query = sb.from('QrCode').select('*')
      for (const [key, value] of Object.entries(where)) {
        if (value === null) query = query.is(key, null)
        else query = query.eq(key, value)
      }
      const { data } = await query.limit(1).maybeSingle()
      return parseRow(data, ['design', 'redirectRules', 'tags']) as any
    },
    async create({ data }: { data: Record<string, unknown> }) {
      // Serialize JSON fields
      
      if (typeof serialized.design === 'object') serialized.design = JSON.stringify(serialized.design)
      if (serialized.redirectRules && typeof serialized.redirectRules === 'object') serialized.redirectRules = JSON.stringify(serialized.redirectRules)
      if (serialized.tags && typeof serialized.tags === 'object') serialized.tags = JSON.stringify(serialized.tags)
      const sb = getClient()
      const { data: result } = await sb.from('QrCode').insert(serialized).select().single()
      return parseRow(result, ['design', 'redirectRules', 'tags']) as any
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      
      if (typeof serialized.design === 'object') serialized.design = JSON.stringify(serialized.design)
      if (serialized.redirectRules && typeof serialized.redirectRules === 'object') serialized.redirectRules = JSON.stringify(serialized.redirectRules)
      if (serialized.tags && typeof serialized.tags === 'object') serialized.tags = JSON.stringify(serialized.tags)
      const sb = getClient()
      const { data: result } = await sb.from('QrCode').update(serializeData(serialized)).eq('id', where.id).select().single()
      return parseRow(result, ['design', 'redirectRules', 'tags']) as any
    },
    async delete({ where }: { where: { id: string } }) {
      const sb = getClient()
      await sb.from('QrCode').delete().eq('id', where.id)
    },
    async count({ where }: { where: Record<string, unknown> }) {
      const sb = getClient()
      let query = sb.from('QrCode').select('*', { count: 'exact', head: true })
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value)
      }
      const { count } = await query
      return count ?? 0
    },
  },

  // ── Scan ──
  scan: {
    async findMany({ where, orderBy, take }: { where?: Record<string, unknown>; orderBy?: { scannedAt?: 'desc' }; take?: number }) {
      const sb = getClient()
      let query = sb.from('Scan').select('*')
      if (where) for (const [key, value] of Object.entries(where)) {
        if (key === 'scannedAt' && typeof value === 'object' && value !== null && 'gte' in value) {
          query = query.gte('scannedAt', (value as { gte: string }).gte)
        } else {
          query = query.eq(key, value)
        }
      }
      if (orderBy?.scannedAt === 'desc') query = query.order('scannedAt', { ascending: false })
      if (take) query = query.limit(take)
      const { data } = await query
      return (data || []).map(r => parseRow(r)) as any[]
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const sb = getClient()
      const { data: result } = await sb.from('Scan').insert(serializeData(data)).select().single()
      return parseRow(result) as any
    },
  },

  // ── Folder ──
  folder: {
    async findMany({ where, orderBy }: { where?: Record<string, unknown>; orderBy?: { createdAt?: 'asc' } }) {
      const sb = getClient()
      let query = sb.from('Folder').select('*')
      if (where) for (const [key, value] of Object.entries(where)) query = query.eq(key, value)
      if (orderBy?.createdAt === 'asc') query = query.order('createdAt', { ascending: true })
      const { data } = await query
      return (data || []).map(r => parseRow(r)) as any[]
    },
    async findFirst({ where }: { where: Record<string, unknown> }) {
      const sb = getClient()
      let query = sb.from('Folder').select('*')
      for (const [key, value] of Object.entries(where)) query = query.eq(key, value)
      const { data } = await query.limit(1).maybeSingle()
      return parseRow(data) as any
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const sb = getClient()
      const { data: result } = await sb.from('Folder').insert(serializeData(data)).select().single()
      return parseRow(result) as any
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const sb = getClient()
      const { data: result } = await sb.from('Folder').update(serializeData(data)).eq('id', where.id).select().single()
      return parseRow(result) as any
    },
    async delete({ where }: { where: { id: string } }) {
      const sb = getClient()
      await sb.from('Folder').delete().eq('id', where.id)
    },
  },

  // ── Template ──
  template: {
    async findMany({ where, orderBy }: { where?: Record<string, unknown>; orderBy?: { createdAt?: 'desc' } }) {
      const sb = getClient()
      let query = sb.from('Template').select('*')
      if (where) for (const [key, value] of Object.entries(where)) {
        if (value === null) query = query.is(key, null)
        else query = query.eq(key, value)
      }
      if (orderBy?.createdAt === 'desc') query = query.order('createdAt', { ascending: false })
      const { data } = await query
      return (data || []).map(r => parseRow(r, ['design'])) as any[]
    },
    async create({ data }: { data: Record<string, unknown> }) {
      
      if (typeof serialized.design === 'object') serialized.design = JSON.stringify(serialized.design)
      const sb = getClient()
      const { data: result } = await sb.from('Template').insert(serialized).select().single()
      return parseRow(result, ['design']) as any
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const sb = getClient()
      const { data: result } = await sb.from('Template').update(serializeData(data)).eq('id', where.id).select().single()
      return parseRow(result) as any
    },
    async delete({ where }: { where: { id: string } }) {
      const sb = getClient()
      await sb.from('Template').delete().eq('id', where.id)
    },
  },

  // ── ApiKey ──
  apiKey: {
    async findMany({ where, orderBy }: { where?: Record<string, unknown>; orderBy?: { createdAt?: 'desc' } }) {
      const sb = getClient()
      let query = sb.from('ApiKey').select('*')
      if (where) for (const [key, value] of Object.entries(where)) query = query.eq(key, value)
      if (orderBy?.createdAt === 'desc') query = query.order('createdAt', { ascending: false })
      const { data } = await query
      return (data || []).map(r => parseRow(r)) as any[]
    },
    async findFirst({ where }: { where: Record<string, unknown> }) {
      const sb = getClient()
      let query = sb.from('ApiKey').select('*, User(*)')
      for (const [key, value] of Object.entries(where)) query = query.eq(key, value)
      const { data } = await query.limit(1).maybeSingle()
      if (!data) return null
      const user = data.User
      delete data.User
      return { ...parseRow(data), user: parseRow(user) } as any
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const sb = getClient()
      const { data: result } = await sb.from('ApiKey').insert(serializeData(data)).select().single()
      return parseRow(result) as any
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const sb = getClient()
      const { data: result } = await sb.from('ApiKey').update(serializeData(data)).eq('id', where.id).select().single()
      return parseRow(result) as any
    },
    async delete({ where }: { where: { id: string } }) {
      const sb = getClient()
      await sb.from('ApiKey').delete().eq('id', where.id)
    },
  },

  // ── Payment ──
  payment: {
    async findMany({ where, orderBy }: { where?: Record<string, unknown>; orderBy?: { createdAt?: 'desc' } }) {
      const sb = getClient()
      let query = sb.from('Payment').select('*')
      if (where) for (const [key, value] of Object.entries(where)) query = query.eq(key, value)
      if (orderBy?.createdAt === 'desc') query = query.order('createdAt', { ascending: false })
      const { data } = await query
      return (data || []).map(r => parseRow(r)) as any[]
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const sb = getClient()
      const { data: result } = await sb.from('Payment').insert(serializeData(data)).select().single()
      return parseRow(result) as any
    },
  },

  // ── AuditLog ──
  auditLog: {
    async findMany({ orderBy, take }: { orderBy?: { createdAt?: 'desc' }; take?: number }) {
      const sb = getClient()
      let query = sb.from('AuditLog').select('*')
      if (orderBy?.createdAt === 'desc') query = query.order('createdAt', { ascending: false })
      if (take) query = query.limit(take)
      const { data } = await query
      return (data || []).map(r => parseRow(r, ['metadata'])) as any[]
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const sb = getClient()
      
      if (serialized.metadata && typeof serialized.metadata === 'object') serialized.metadata = JSON.stringify(serialized.metadata)
      await sb.from('AuditLog').insert(serializeData(serialized))
    },
  },

  // ── QrCodeRevision ──
  qrCodeRevision: {
    async findMany({ where, orderBy, take }: { where: Record<string, unknown>; orderBy?: { editedAt?: 'desc' }; take?: number }) {
      const sb = getClient()
      let query = sb.from('QrCodeRevision').select('*')
      for (const [key, value] of Object.entries(where)) query = query.eq(key, value)
      if (orderBy?.editedAt === 'desc') query = query.order('editedAt', { ascending: false })
      if (take) query = query.limit(take)
      const { data } = await query
      return (data || []).map(r => parseRow(r, ['design', 'redirectRules'])) as any[]
    },
    async create({ data }: { data: Record<string, unknown> }) {
      
      if (typeof serialized.design === 'object') serialized.design = JSON.stringify(serialized.design)
      if (serialized.redirectRules && typeof serialized.redirectRules === 'object') serialized.redirectRules = JSON.stringify(serialized.redirectRules)
      const sb = getClient()
      await sb.from('QrCodeRevision').insert(serializeData(serialized))
    },
  },

  // ── Webhook ──
  webhook: {
    async findMany({ where, orderBy }: { where?: Record<string, unknown>; orderBy?: { createdAt?: 'desc' } }) {
      const sb = getClient()
      let query = sb.from('Webhook').select('*')
      if (where) for (const [key, value] of Object.entries(where)) query = query.eq(key, value)
      if (orderBy?.createdAt === 'desc') query = query.order('createdAt', { ascending: false })
      const { data } = await query
      return (data || []).map(r => parseRow(r)) as any[]
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const sb = getClient()
      const { data: result } = await sb.from('Webhook').insert(serializeData(data)).select().single()
      return parseRow(result) as any
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const sb = getClient()
      const { data: result } = await sb.from('Webhook').update(serializeData(data)).eq('id', where.id).select().single()
      return parseRow(result) as any
    },
    async delete({ where }: { where: { id: string } }) {
      const sb = getClient()
      await sb.from('Webhook').delete().eq('id', where.id)
    },
  },
}
