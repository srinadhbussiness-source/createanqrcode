import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function formatDate(iso: string | null, fmt = 'dd MMM yyyy') {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), fmt)
  } catch {
    return '—'
  }
}

export function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), "dd MMM yyyy 'at' h:mm a")
  } catch {
    return '—'
  }
}

export function timeAgo(iso: string | null) {
  if (!iso) return ''
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return ''
  }
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat('en-IN').format(n)
}

export function formatCurrency(amount: number, currency: 'INR' | 'USD') {
  if (currency === 'INR') return `₹${amount.toLocaleString('en-IN')}`
  return `$${amount}`
}

export function initials(name: string | null | undefined, email: string | null | undefined) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  }
  if (email) return email[0]?.toUpperCase() ?? '?'
  return '?'
}

export function generateShortCode(len = 7) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export function generateApiKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let body = ''
  for (let i = 0; i < 36; i++) body += chars[Math.floor(Math.random() * chars.length)]
  return `qac_live_${body}`
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
