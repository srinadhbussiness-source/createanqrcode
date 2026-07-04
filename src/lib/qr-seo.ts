import type { Metadata } from 'next'
import { typeSlug, typeIdFromSlug, QR_TYPE_MAP, getSeo, QR_TYPES, QR_CATEGORIES } from '@/lib/qr-types'

/**
 * This module exports generateStaticParams + generateMetadata for SEO.
 * It's imported by the catch-all route below.
 */

export function getTypeFromSlug(slug: string) {
  return typeIdFromSlug(slug)
}

export function generateTypeMetadata(slug: string): Metadata {
  const typeId = typeIdFromSlug(slug)
  if (!typeId || !QR_TYPE_MAP[typeId]) {
    return {
      title: 'All 83 QR Code Types — Free Generator | CreateAnQRCode',
      description: 'Browse 83+ QR code types across 11 categories. Free, no watermark, no sign-up. URL, WiFi, vCard, UPI, crypto, social and more.',
    }
  }

  const t = QR_TYPE_MAP[typeId]
  const seo = getSeo(typeId)
  const cat = QR_CATEGORIES.find((c) => c.id === t.category)
  const slugUrl = typeSlug(typeId)

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: `/${slugUrl}`,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: 'website',
      siteName: 'CreateAnQRCode',
    },
    twitter: {
      card: 'summary',
      title: seo.title,
      description: seo.description,
    },
    other: {
      'article:section': cat?.label ?? 'QR Codes',
    },
  }
}

/** All type slugs for static generation hints */
export function getAllTypeSlugs() {
  return QR_TYPES.map((t) => typeSlug(t.id))
}
