// Centralized type definitions for CreateAnQRCode

export type Plan = 'free' | 'starter' | 'pro' | 'business'

// QrTypeId is now an open string so we can support 80+ types without a giant union.
export type QrTypeId = string

export type QrStatus = 'active' | 'paused' | 'expired' | 'archived' | 'trashed'

export interface QrDesign {
  fgColor: string
  bgColor: string
  transparentBg: boolean
  dotStyle: 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded'
  eyeStyle: 'square' | 'extra-rounded' | 'dot'
  errorCorrection: 'L' | 'M' | 'Q' | 'H'
  outputSize: 256 | 512 | 1024 | 2048
  gradientType: 'none' | 'linear' | 'radial'
  gradientStart: string
  gradientEnd: string
  gradientAngle: number
  logoSize: number // 10-40 percent
  logoPadding: number // 0-20 px
  // ── Advanced customizations ──
  eyeColor: string // separate color for corner eyes (empty = use fgColor)
  quietZone: number // 0-40 px margin around the QR modules
  frameStyle: 'none' | 'rounded' | 'circle' | 'square'
  frameColor: string
  frameWidth: number // 0-20 px border thickness
}

export const DEFAULT_DESIGN: QrDesign = {
  fgColor: '#000000',
  bgColor: '#FFFFFF',
  transparentBg: false,
  dotStyle: 'square',
  eyeStyle: 'square',
  errorCorrection: 'M',
  outputSize: 512,
  gradientType: 'none',
  gradientStart: '#000000',
  gradientEnd: '#52525B',
  gradientAngle: 45,
  logoSize: 20,
  logoPadding: 5,
  eyeColor: '', // empty = inherit fgColor
  quietZone: 0,
  frameStyle: 'none',
  frameColor: '#000000',
  frameWidth: 0,
}

export interface QrCodeRecord {
  id: string
  userId: string
  title: string
  qrType: QrTypeId
  isDynamic: boolean
  status: QrStatus
  staticPayload: string | null
  shortCode: string | null
  destinationUrl: string | null
  passwordHash: string | null
  expiresAt: string | null
  activatesAt: string | null
  maxScans: number | null
  redirectRules: RedirectRule[] | null
  design: QrDesign
  logoDataUrl: string | null
  overlayDataUrl: string | null
  overlayOpacity: number
  favorite: boolean
  archived: boolean
  trashed: boolean
  trashedAt: string | null
  folderId: string | null
  tags: string[]
  scanCount: number
  downloadCount: number
  createdAt: string
  updatedAt: string
}

export interface RedirectRule {
  id: string
  type: 'country' | 'device' | 'city' | 'os' | 'browser'
  value: string
  destination: string
}

export interface FolderRecord {
  id: string
  userId: string
  name: string
  color: string
  count: number
  createdAt: string
}

export interface ScanRecord {
  id: string
  qrCodeId: string
  countryCode: string | null
  countryName: string | null
  city: string | null
  deviceType: string | null
  os: string | null
  browser: string | null
  referrer: string | null
  language: string | null
  scannedAt: string
}

export interface TemplateRecord {
  id: string
  name: string
  category: 'business' | 'events' | 'marketing' | 'education' | 'india' | 'custom'
  isPro: boolean
  design: QrDesign
  userId: string | null
  isSystem?: boolean
  createdAt?: string
}

export interface ApiKeyRecord {
  id: string
  name: string
  prefix: string
  scopes: string
  lastUsed: string | null
  createdAt: string
}

export interface UserRecord {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  plan: Plan
  trialEndsAt: string | null
  timezone: string
  dateFormat: string
  emailVerified: boolean
  notifSecurity: boolean
  notifTrial: boolean
  notifScans: boolean
  notifExpiry: boolean
  notifDigest: boolean
  notifUpdates: boolean
  role: 'user' | 'admin' | 'superadmin'
  suspended: boolean
  twoFactorEnabled: boolean
  createdAt: string
}

export const PLAN_LIMITS: Record<Plan, {
  dynamicQr: number | null
  analyticsDays: number | null
  bulkBatch: number | null
  api: boolean
  teamSeats: number
  customDomain: boolean
  whiteLabel: boolean
  trialDays: number | null
  priceInr: number
  priceUsd: number
}> = {
  // Free — beats QR Tiger (3 dynamic, 500-scan cap) & Bitly (2 QR/mo):
  // 10 dynamic QR + UNLIMITED scans + 7-day analytics, no watermark.
  free: { dynamicQr: 10, analyticsDays: 7, bulkBatch: 0, api: false, teamSeats: 1, customDomain: false, whiteLabel: false, trialDays: null, priceInr: 0, priceUsd: 0 },
  // Starter ₹299/$5 — beats QR Tiger Regular ($7, 12 dynamic) on price & volume.
  starter: { dynamicQr: 50, analyticsDays: 30, bulkBatch: 0, api: false, teamSeats: 1, customDomain: false, whiteLabel: false, trialDays: 7, priceInr: 299, priceUsd: 5 },
  // Pro ₹699/$12 — beats QR Tiger Advanced ($16, 200 dynamic): 250 dynamic, API, bulk, UPI dynamic.
  pro: { dynamicQr: 250, analyticsDays: 365, bulkBatch: 1000, api: true, teamSeats: 1, customDomain: false, whiteLabel: false, trialDays: 7, priceInr: 699, priceUsd: 12 },
  // Business ₹1,799/$29 — beats Beaconstac ($99): unlimited dynamic, 10 seats, white-label.
  business: { dynamicQr: null, analyticsDays: null, bulkBatch: 5000, api: true, teamSeats: 10, customDomain: true, whiteLabel: true, trialDays: 14, priceInr: 1799, priceUsd: 29 },
}
