import { db } from './db'
import { generateShortCode } from './format'

// Seed demo scan data for a QR code (for analytics demo)
export async function seedDemoScans(qrCodeId: string, count = 50) {
  const countries = [
    { code: 'IN', name: 'India', cities: ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai'], weight: 0.37 },
    { code: 'US', name: 'USA', cities: ['New York', 'San Francisco', 'Chicago'], weight: 0.19 },
    { code: 'GB', name: 'UK', cities: ['London', 'Manchester'], weight: 0.10 },
    { code: 'DE', name: 'Germany', cities: ['Berlin', 'Munich'], weight: 0.08 },
    { code: 'AE', name: 'UAE', cities: ['Dubai', 'Abu Dhabi'], weight: 0.07 },
    { code: 'CA', name: 'Canada', cities: ['Toronto', 'Vancouver'], weight: 0.06 },
    { code: 'AU', name: 'Australia', cities: ['Sydney', 'Melbourne'], weight: 0.05 },
    { code: 'SG', name: 'Singapore', cities: ['Singapore'], weight: 0.04 },
    { code: 'JP', name: 'Japan', cities: ['Tokyo'], weight: 0.03 },
    { code: 'FR', name: 'France', cities: ['Paris'], weight: 0.01 },
  ]
  const devices = [
    { type: 'Mobile', weight: 0.72 },
    { type: 'Desktop', weight: 0.21 },
    { type: 'Tablet', weight: 0.07 },
  ]
  const oses = [
    { name: 'Android', weight: 0.45 },
    { name: 'iOS', weight: 0.38 },
    { name: 'Windows', weight: 0.12 },
    { name: 'macOS', weight: 0.05 },
  ]
  const browsers = [
    { name: 'Chrome', weight: 0.68 },
    { name: 'Safari', weight: 0.21 },
    { name: 'Firefox', weight: 0.07 },
    { name: 'Edge', weight: 0.04 },
  ]
  const referrers = [
    { name: 'Direct / No referrer', weight: 0.505 },
    { name: 'google.com', weight: 0.19 },
    { name: 'instagram.com', weight: 0.079 },
    { name: 'facebook.com', weight: 0.06 },
    { name: 'twitter.com', weight: 0.04 },
    { name: 'linkedin.com', weight: 0.03 },
    { name: 'youtube.com', weight: 0.025 },
    { name: 'whatsapp.com', weight: 0.071 },
  ]
  const languages = ['en-IN', 'en-US', 'en-GB', 'de-DE', 'hi-IN', 'fr-FR', 'ja-JP']

  const pick = <T,>(arr: { weight: number }[] & T[]): T => {
    const r = Math.random()
    let acc = 0
    for (const item of arr as unknown as { weight: number }[]) {
      acc += item.weight
      if (r <= acc) return item as unknown as T
    }
    return arr[0] as unknown as T
  }

  const scans = []
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    // distribute scans over last 30 days, weighted to recent
    const daysAgo = Math.floor(Math.pow(Math.random(), 0.6) * 30)
    const hour = Math.floor(Math.random() * 24)
    const scannedAt = new Date(now - daysAgo * 86400000)
    scannedAt.setHours(hour, Math.floor(Math.random() * 60), 0, 0)
    const country = pick(countries as never) as typeof countries[number]
    const city = country.cities[Math.floor(Math.random() * country.cities.length)]
    const device = pick(devices as never) as typeof devices[number]
    const os = pick(oses as never) as typeof oses[number]
    const browser = pick(browsers as never) as typeof browsers[number]
    const ref = pick(referrers as never) as typeof referrers[number]
    scans.push({
      qrCodeId,
      countryCode: country.code,
      countryName: country.name,
      city,
      deviceType: device.type,
      os: os.name,
      browser: browser.name,
      referrer: ref.name,
      language: languages[Math.floor(Math.random() * languages.length)],
      ipHash: generateShortCode(16),
      scannedAt,
    })
  }
  await db.scan.createMany({ data: scans })
  await db.qrCode.update({ where: { id: qrCodeId }, data: { scanCount: { increment: count } } })
  return scans.length
}
