'use client'

import { useState } from 'react'
import { ArrowRight, Search, Clock, Tag, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useRouterStore } from '@/lib/stores'

interface BlogPost {
  slug: string
  title: string
  excerpt: string
  category: 'Guides' | 'Marketing' | 'Product' | 'Industry'
  date: string
  readMins: number
  author: string
}

const POSTS: BlogPost[] = [
  { slug: 'dynamic-vs-static-qr', title: 'Dynamic vs Static QR Codes: Which Should You Use?', excerpt: 'A practical breakdown of when to choose dynamic over static, the cost tradeoffs, and why dynamic codes pay for themselves after one reprint.', category: 'Guides', date: '2025-06-28', readMins: 6, author: 'CreateAnQRCode Team' },
  { slug: 'qr-code-design-best-practices', title: 'QR Code Design: 8 Rules for Scannable, Beautiful Codes', excerpt: 'Contrast, error correction, logo sizing, quiet zones — the design choices that make or break scannability. With visual examples.', category: 'Guides', date: '2025-06-20', readMins: 8, author: 'CreateAnQRCode Team' },
  { slug: 'upi-qr-for-small-business', title: 'How UPI QR Codes Are Transforming Small Business in India', excerpt: 'From kirana stores to street vendors — why UPI QR adoption crossed 300M users and how to set one up in 60 seconds.', category: 'Industry', date: '2025-06-15', readMins: 5, author: 'CreateAnQRCode Team' },
  { slug: 'qr-analytics-that-matter', title: '5 QR Analytics Metrics That Actually Matter for Marketers', excerpt: 'Skip vanity metrics. These are the scan-data signals that tell you whether your offline-to-online funnel is working.', category: 'Marketing', date: '2025-06-10', readMins: 7, author: 'CreateAnQRCode Team' },
  { slug: 'whats-new-80-types', title: 'We Just Added 80+ QR Types — Here\'s What\'s New', excerpt: 'From crypto addresses to video-call links, our new type library covers every use case. A tour of the 11 categories.', category: 'Product', date: '2025-06-05', readMins: 4, author: 'CreateAnQRCode Team' },
  { slug: 'qr-code-print-quality', title: 'The Print Quality Checklist: Never Ship a Blurry QR Code Again', excerpt: 'Resolution, vector formats, sizing for distance — the technical spec every designer needs before sending a QR to print.', category: 'Guides', date: '2025-05-28', readMins: 6, author: 'CreateAnQRCode Team' },
  { slug: 'restaurant-menu-qr-guide', title: 'The Complete Restaurant Menu QR Guide (2025)', excerpt: 'Hygiene, cost savings, real-time updates — why 70% of restaurants now use QR menus and how to deploy one in minutes.', category: 'Industry', date: '2025-05-20', readMins: 9, author: 'CreateAnQRCode Team' },
  { slug: 'qr-redirect-rules', title: 'Redirect Rules: One QR Code, Smart Destinations', excerpt: 'Send mobile users to your app, desktop users to your site, and country-specific visitors to localized pages — all from one QR.', category: 'Product', date: '2025-05-12', readMins: 5, author: 'CreateAnQRCode Team' },
  { slug: 'event-qr-codes', title: 'Using QR Codes for Events: Tickets, Check-ins & Engagement', excerpt: 'Conference check-ins, scavenger hunts, feedback forms — a field guide to running QR-powered events without the chaos.', category: 'Marketing', date: '2025-05-05', readMins: 7, author: 'CreateAnQRCode Team' },
  { slug: 'qr-code-security', title: 'QR Code Security: Passwords, Expiry & What to Watch For', excerpt: 'How to protect dynamic QR codes with passwords, set scan caps, and recognize QR-jacking risks. A security primer.', category: 'Guides', date: '2025-04-28', readMins: 8, author: 'CreateAnQRCode Team' },
]

const CATEGORIES = ['All', 'Guides', 'Marketing', 'Product', 'Industry'] as const

export function BlogView() {
  const navigate = useRouterStore((s) => s.navigate)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('All')

  const filtered = POSTS.filter((p) => {
    if (cat !== 'All' && p.category !== cat) return false
    if (query && !p.title.toLowerCase().includes(query.toLowerCase()) && !p.excerpt.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  const featured = POSTS[0]

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Header */}
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <Badge variant="outline" className="mb-3 border-brand/30 text-brand">Blog</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Guides, product news & QR insights</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Practical advice on designing, deploying and measuring QR codes — written by the CreateAnQRCode team.
        </p>
      </div>

      {/* Search + categories */}
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={'tap-none rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ' +
                (cat === c ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-background hover:border-brand/40 hover:text-brand')}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search articles…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Featured post (only when no filter) */}
      {!query && cat === 'All' && (
        <Card className="mb-10 overflow-hidden rounded-2xl">
          <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="flex-1">
              <div className="mb-3 flex items-center gap-3">
                <Badge variant="secondary">Featured</Badge>
                <span className="text-xs text-muted-foreground">{featured.category}</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{featured.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{featured.excerpt}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {featured.readMins} min read</span>
                <span>{new Date(featured.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <Button className="mt-5 bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate('create')}>
                Read article <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post grid */}
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.slug} className="group flex flex-col rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md hover:border-brand/40">
            <CardContent className="flex flex-1 flex-col p-5">
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="outline" className="border-brand/30 text-brand text-[10px]">{p.category}</Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {p.readMins}m</span>
              </div>
              <h3 className="text-base font-semibold leading-snug">{p.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>
              <div className="mt-auto pt-4">
                <p className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <button className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                  Read more <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <Tag className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No articles match &ldquo;{query}&rdquo;.</p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-16 rounded-3xl bg-brand-muted/50 p-8 text-center sm:p-12">
        <h2 className="text-2xl font-bold sm:text-3xl">Put these tips into practice</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Create your first QR code free — no signup, no watermark.</p>
        <Button className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate('create')}>
          Create a QR code <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default BlogView
