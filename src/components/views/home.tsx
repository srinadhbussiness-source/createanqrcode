'use client'

import {
  ArrowRight, Sparkles, QrCode, Zap, Gift, ShieldCheck, BarChart3,
  Code2, Star, Check, Play, Lock, Globe, Clock, TrendingUp,
  Users, Server,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouterStore } from '@/lib/stores'
import { QR_TYPES, QR_CATEGORIES, popularTypes } from '@/lib/qr-types'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

const STATS = [
  { value: '2.4M+', label: 'QR codes created', icon: QrCode },
  { value: '180+', label: 'countries', icon: Globe },
  { value: '99.9%', label: 'uptime SLA', icon: Server },
  { value: '4.9/5', label: 'user rating', icon: Star },
]

const FEATURES = [
  { icon: Gift, title: 'Free forever', body: 'Create unlimited static QR codes at no cost. No credit card, no trial, no catch.' },
  { icon: ShieldCheck, title: 'No watermark', body: 'Every download is clean — no logos, no branding, just your code. Ever.' },
  { icon: QrCode, title: '83 QR types', body: 'URL, WiFi, vCard, UPI, crypto, WhatsApp, social, calendar and 75+ more.' },
  { icon: Zap, title: 'Dynamic QR codes', body: 'Update destinations anytime without reprinting. Track every single scan.' },
  { icon: BarChart3, title: 'Scan analytics', body: 'Location, device, time, browser — understand exactly how your codes perform.' },
  { icon: Code2, title: 'REST API', body: 'Generate QR codes programmatically. 60 req/min, signed webhooks, SDK-ready.' },
]

const STEPS = [
  { n: 1, title: 'Choose a type', body: 'Pick from 83 QR types across 11 categories — URL, vCard, WiFi, UPI, social and more.' },
  { n: 2, title: 'Customize', body: 'Tune colors, dots, eyes, gradients and add your logo. See changes live as you design.' },
  { n: 3, title: 'Download & track', body: 'Export PNG or SVG. Make it dynamic to track scans and edit destinations later.' },
]

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'Cafe Owner, Bengaluru', initials: 'PS', quote: 'I switched our printed menu to a QR code. Customers love it and I save $50/month on printing. The analytics show me peak hours — gold.', rating: 5 },
  { name: 'Arjun Mehta', role: 'Indie Musician', initials: 'AM', quote: 'Spotify QR on every poster. Scans tripled after I customized the design — looks pro, no watermark. Best free QR tool I\'ve used.', rating: 5 },
  { name: 'Riya Kapoor', role: 'Marketing Lead, TechCorp', initials: 'RK', quote: 'Dynamic codes mean I can change a campaign URL even after printing 10,000 flyers. The redirect rules and analytics replaced 3 tools for us.', rating: 5 },
]

const TRUST_BADGES = [
  { icon: Lock, label: 'Password protected', desc: 'bcrypt-hashed QR passwords' },
  { icon: ShieldCheck, label: 'IP-hashed analytics', desc: 'Daily-salt SHA-256 — raw IPs never stored' },
  { icon: Server, label: '99.9% uptime', desc: 'Global CDN + redundant infrastructure' },
  { icon: Globe, label: 'GDPR ready', desc: 'Data export + account deletion built in' },
]

const PRICING_PREVIEW = [
  { id: 'free', name: 'Free', priceUsd: 0, popular: false, tagline: 'For individuals', features: ['10 dynamic QR · ∞ scans', '7-day analytics', 'No watermark', 'PNG + SVG export'] as React.ReactNode[] },
  { id: 'pro', name: 'Pro', priceUsd: 12, popular: true, tagline: 'For power users', features: ['250 dynamic QR · ∞ scans', '365-day analytics', 'Bulk + REST API', 'Redirect rules'] as React.ReactNode[] },
  {
    id: 'business',
    name: 'Business',
    priceUsd: 29,
    popular: false,
    tagline: 'For teams',
    features: [
      'Unlimited dynamic QR',
      <span key="team" className="inline-flex items-center">10 team seats <Badge variant="outline" className="ml-1.5 align-middle text-[10px] text-muted-foreground">Soon</Badge></span>,
      <span key="domain" className="inline-flex items-center">Custom domain <Badge variant="outline" className="ml-1.5 align-middle text-[10px] text-muted-foreground">Soon</Badge></span>,
      <span key="wl" className="inline-flex items-center">White-label <Badge variant="outline" className="ml-1.5 align-middle text-[10px] text-muted-foreground">Soon</Badge></span>,
    ] as React.ReactNode[],
  },
]

const FAQS = [
  { q: 'Is CreateAnQRCode really free?', a: 'Yes — free forever. Create unlimited static QR codes, download PNG/SVG, no watermark, no credit card. Dynamic QR codes (for analytics & editable destinations) are free up to 10 codes.' },
  { q: 'Do I need an account to create a QR code?', a: 'No. You can create, customize and download QR codes instantly without signing up. You only need an account to save codes, use dynamic links, and view scan analytics.' },
  { q: 'Are there watermarks on the QR codes?', a: 'Never. Every QR code you generate — free or paid — is completely clean. No "Made with..." branding, no logos, no watermarks. Your codes look professional.' },
  { q: 'What\'s the difference between static and dynamic QR codes?', a: 'Static QR codes embed the data directly — they can\'t be changed once printed. Dynamic QR codes store a short redirect URL, so you can change the destination anytime and track scans (location, device, time).' },
  { q: 'Can I add my logo to a QR code?', a: 'Yes. Upload a PNG or SVG logo in the customizer. Adjust its size and padding. Use error correction level Q or H so the QR stays scannable with a logo.' },
  { q: 'Is my data secure?', a: 'Yes. Passwords are hashed with bcrypt. QR passwords are server-side hashed. Analytics use IP-hashing with a daily salt — raw IPs are never stored. Sessions are revocable. CSRF protection is built in.' },
]

export function HomeView() {
  const navigate = useRouterStore((s) => s.navigate)

  const goCreateType = (typeId: string) => {
    navigate('type-page', { type: typeId })
  }

  return (
    <div className="flex flex-col">
      {/* ═══ 1. HERO ═══ */}
      <section className="relative overflow-hidden border-b border-border hero-mesh">
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28 md:py-36">
          <div className="animate-fade-in-up">
            {/* Trust microcopy badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-muted/50 px-3.5 py-1.5 text-xs font-medium text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              No credit card · No watermark · Free forever
            </div>

            <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl md:text-7xl">
              Create stunning{' '}
              <span className="text-muted-foreground">QR codes</span>
              {' '}in seconds
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl">
              83+ QR types, full design control, dynamic links with scan analytics.
              Free forever, no watermark, no sign-up required.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate('types')}>
                <Play className="h-4 w-4" />
                Open the Playground
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => navigate('types')}>
                Browse 83+ types
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-brand" /> No sign-up needed</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-brand" /> PNG & SVG export</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-brand" /> Unlimited downloads</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. TRUST BAR ═══ */}
      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <p className="mb-5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Trusted by 2.4M+ creators, marketers & businesses worldwide
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1.5 text-center">
                <s.icon className="h-4 w-4 text-brand" />
                <p className="text-2xl font-bold tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 3. FEATURES ═══ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="outline" className="mb-3 border-brand/30 text-brand">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to ship QR codes</h2>
            <p className="mt-3 text-base text-muted-foreground">
              From a single URL QR to a managed dynamic campaign — built for individuals and teams.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="group card-hover relative rounded-2xl">
                <CardContent>
                  <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand-muted text-brand transition-all duration-200 group-hover:scale-110 group-hover:bg-brand group-hover:text-brand-foreground">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                  <ArrowRight className="pointer-events-none absolute bottom-5 right-5 h-4 w-4 text-brand opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 4. HOW IT WORKS ═══ */}
      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="outline" className="mb-3 border-brand/30 text-brand">How it works</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Create in three steps</h2>
            <p className="mt-3 text-base text-muted-foreground">No tutorials needed. You&apos;ll have a QR code in under a minute.</p>
          </div>
          <div className="grid gap-8 sm:gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative text-center">
                <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand text-brand-foreground text-xl font-bold">
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5. QR TYPES ═══ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <Badge variant="outline" className="mb-3 border-brand/30 text-brand">83 QR types · 11 categories</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">A QR type for every use case</h2>
            <p className="mt-3 text-base text-muted-foreground">
              From simple URLs to UPI payments and vCards — organized by category so you find the right one fast.
            </p>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Most popular</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {popularTypes().map((t) => (
                <button
                  key={t.id}
                  onClick={() => goCreateType(t.id)}
                  className="tap-none group inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition-all hover:border-brand hover:bg-brand-muted hover:text-brand"
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {QR_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate('types')}
                className="tap-none group flex items-start gap-3 rounded-2xl border border-border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-muted text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{c.label}</h3>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button variant="outline" onClick={() => navigate('types')}>
              Browse all {QR_TYPES.length} types <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ 6. TESTIMONIALS ═══ */}
      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="outline" className="mb-3 border-brand/30 text-brand">Loved by creators</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Don&apos;t just take our word for it</h2>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-brand text-brand" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">4.9/5 from 12,000+ users</span>
            </div>
          </div>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="relative overflow-hidden rounded-2xl card-hover">
                <span aria-hidden="true" className="pointer-events-none absolute right-4 top-0 select-none font-serif text-7xl leading-none text-brand/10">&ldquo;</span>
                <CardContent className="relative">
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-brand text-brand" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-muted text-sm font-semibold text-brand">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 7. PRICING ═══ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="outline" className="mb-3 border-brand/30 text-brand">Pricing</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Free to start. Upgrade when you scale.</h2>
            <p className="mt-3 text-base text-muted-foreground">
              No credit card needed. Cancel anytime. Prices in USD — INR also available.
            </p>
          </div>
          <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
            {PRICING_PREVIEW.map((p) => (
              <Card
                key={p.id}
                className={cn(
                  'relative rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg',
                  p.popular && 'border-brand shadow-lg ring-1 ring-brand/30'
                )}
              >
                {p.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-brand-foreground">
                    <Star className="h-3 w-3" /> Popular
                  </Badge>
                )}
                <CardContent>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">{p.tagline}</div>
                  <h3 className="text-2xl font-bold">{p.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${p.priceUsd}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        <span className="text-foreground/90">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={cn('mt-6 w-full', p.popular && 'bg-brand text-brand-foreground hover:bg-brand/90')}
                    variant={p.popular ? 'default' : 'outline'}
                    onClick={() => navigate('pricing')}
                  >
                    {p.id === 'free' ? 'Start free' : `Choose ${p.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button variant="link" onClick={() => navigate('pricing')} className="text-brand">
              Compare all features <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ 8. SECURITY & TRUST ═══ */}
      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="outline" className="mb-3 border-brand/30 text-brand">Security & Trust</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built secure from the ground up</h2>
            <p className="mt-3 text-base text-muted-foreground">
              Your data is protected with enterprise-grade security — even on the free plan.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_BADGES.map((b) => (
              <Card key={b.label} className="rounded-2xl text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-muted text-brand">
                    <b.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold">{b.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 9. FAQ ═══ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-10 text-center">
            <Badge variant="outline" className="mb-3 border-brand/30 text-brand">FAQ</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Questions? We&apos;ve got answers</h2>
          </div>
          <Accordion type="single" collapsible className="rounded-2xl border border-border px-4">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ═══ 10. FINAL CTA ═══ */}
      <section className="inverted">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-current/15 px-4 py-1.5 text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="opacity-80">Join 2.4M+ creators</span>
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] sm:text-4xl md:text-5xl">
            Ready to play?
          </h2>
          <p className="mx-auto mt-4 max-w-xl opacity-70">
            Open the playground and create your first QR code in seconds. No credit card, no watermark, no limits.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => navigate('types')}
              className="w-full bg-current text-background hover:bg-current/90 sm:w-auto"
            >
              <Play className="h-4 w-4" />
              Open the Playground
            </Button>
            <Button size="lg" variant="outline" className="w-full border-current/30 bg-transparent text-current hover:bg-current/10 sm:w-auto" onClick={() => navigate('signup')}>
              Create a free account
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomeView
