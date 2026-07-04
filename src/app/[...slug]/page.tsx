import type { Metadata } from 'next'
import { generateTypeMetadata, getAllTypeSlugs } from '@/lib/qr-seo'
import { typeIdFromSlug, QR_TYPE_MAP, getSeo, typeSlug, QR_CATEGORIES } from '@/lib/qr-types'
import Home from '../page'

// Force dynamic rendering — prevents Next.js from trying to statically
// prerender every slug (which can fail if a slug doesn't match a type).
export const dynamic = 'force-dynamic'

/**
 * Catch-all route for QR type pages (e.g. /wifi-network-qr-code).
 *
 * Generates proper server-side <title>, <meta>, OpenGraph, canonical URL,
 * and JSON-LD structured data for each QR type — search engines see
 * unique, optimized metadata per page.
 */

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const p = await params
  const slug = p.slug?.[0]
  if (!slug) return {}
  return generateTypeMetadata(slug)
}

export default async function TypePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const p = await params
  const slug = p.slug?.[0]
  const typeId = slug ? typeIdFromSlug(slug) : null
  const typeDef = typeId ? QR_TYPE_MAP[typeId] : null
  const seo = typeId ? getSeo(typeId) : null
  const cat = typeDef ? QR_CATEGORIES.find((c) => c.id === typeDef.category) : null

  // JSON-LD structured data for rich search results
  const jsonLd = typeDef && seo ? {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${typeDef.label} QR Code Generator`,
    description: seo.description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: seo.keywords,
    url: `/${typeSlug(typeId!)}`,
    isAccessibleForFree: true,
  } : null

  const faqLd = typeDef && seo ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: seo.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  } : null

  const breadcrumbLd = typeDef && cat ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
      { '@type': 'ListItem', position: 2, name: 'QR Types', item: '/types' },
      { '@type': 'ListItem', position: 3, name: cat.label },
      { '@type': 'ListItem', position: 4, name: typeDef.label, item: `/${slug}` },
    ],
  } : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      )}
      <Home />
    </>
  )
}
