'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Star, Sparkles, ArrowRight, Zap, Shield, X, Infinity as InfinityIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toggle } from '@/components/ui/toggle'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { PLAN_LIMITS, type Plan } from '@/lib/types'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

type Cycle = 'monthly' | 'yearly'
type Currency = 'INR' | 'USD'

const PLANS: { id: Plan; name: string; tagline: string; popular?: boolean; best?: boolean }[] = [
  { id: 'free', name: 'Free', tagline: 'For individuals getting started' },
  { id: 'starter', name: 'Starter', tagline: 'For small businesses & creators' },
  { id: 'pro', name: 'Pro', tagline: 'For power users & freelancers', popular: true },
  { id: 'business', name: 'Business', tagline: 'For teams & agencies', best: true },
]

// Feature matrix — every row compares all 4 plans
const FEATURES_MATRIX: { feature: string; soon?: boolean; free: string | boolean; starter: string | boolean; pro: string | boolean; business: string | boolean }[] = [
  { feature: 'Static QR codes', free: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited', business: 'Unlimited' },
  { feature: 'Dynamic QR codes', free: '10', starter: '50', pro: '250', business: 'Unlimited' },
  { feature: 'Monthly scans', free: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited', business: 'Unlimited' },
  { feature: 'Scan analytics', free: '7 days', starter: '30 days', pro: '365 days', business: 'Unlimited' },
  { feature: 'Bulk generation', free: false, starter: false, pro: '1,000 / batch', business: '5,000 / batch' },
  { feature: 'REST API access', free: false, starter: false, pro: true, business: true },
  { feature: 'Password protection', free: true, starter: true, pro: true, business: true },
  { feature: 'Expiry & max scans', free: true, starter: true, pro: true, business: true },
  { feature: 'Custom short URLs', free: false, starter: true, pro: true, business: true },
  { feature: 'UPI dynamic payments', free: false, starter: false, pro: true, business: true },
  { feature: 'All 80+ QR types', free: true, starter: true, pro: true, business: true },
  { feature: 'Team seats', soon: true, free: '1', starter: '1', pro: '1', business: '10' },
  { feature: 'Custom domain', soon: true, free: false, starter: false, pro: false, business: true },
  { feature: 'White-label / remove branding', soon: true, free: false, starter: false, pro: false, business: true },
  { feature: 'No watermark', free: true, starter: true, pro: true, business: true },
  { feature: 'Priority support', free: false, starter: 'Email', pro: 'Priority', business: 'Dedicated' },
  { feature: 'Free trial', free: false, starter: '7 days', pro: '7 days', business: '14 days' },
]

// Competitor comparison — shows how we beat the market
const COMPETITORS = [
  { name: 'CreateAnQRCode', free: '10 dynamic · ∞ scans', pro: '$12 / mo', scans: 'Unlimited', upi: true, watermark: false, us: true },
  { name: 'QR Tiger', free: '3 dynamic · 500 scans', pro: '$16 / mo', scans: 'Capped on free', upi: false, watermark: false, us: false },
  { name: 'Bitly', free: '2 QR / month', pro: '$13+ / mo', scans: 'Unlimited', upi: false, watermark: true, us: false },
  { name: 'Beaconstac', free: 'No free plan', pro: '$49+ / mo', scans: '25,000 cap', upi: false, watermark: false, us: false },
  { name: 'QR Code Monkey', free: 'Static only', pro: '$5+ / mo', scans: 'No analytics free', upi: false, watermark: false, us: false },
]

const FAQS = [
  { q: 'Is there really a free plan?', a: 'Yes — Free forever. 10 dynamic QR codes, unlimited static codes, unlimited scans, 7-day analytics, no watermark, no credit card. Most competitors cap free scans at 500 or limit you to 2-3 codes.' },
  { q: 'What is a dynamic QR code?', a: 'A dynamic QR stores a short redirect URL instead of the destination itself, so you can change the destination after printing and get scan analytics. Static codes embed data directly and can\'t be edited or tracked.' },
  { q: 'Are scans really unlimited?', a: 'Yes. Unlike QR Tiger (500-scan free cap) and Beaconstac (25,000-scan paid cap), every CreateAnQRCode plan — including Free — has unlimited scans for the subscription period.' },
  { q: 'Can I change plans later?', a: 'Anytime. Upgrades take effect immediately; downgrades take effect at the end of your billing period. No lock-in.' },
  { q: 'Do you offer refunds?', a: '7-day money-back guarantee on all paid plans. Not satisfied? Contact support within 7 days for a full refund.' },
  { q: 'What payment methods do you accept?', a: 'All major credit/debit cards, UPI (India), and net banking. Business plans can pay via bank transfer. Annual billing saves you 2 months (≈17%).' },
  { q: 'Is there an API?', a: 'Yes — Pro and Business plans include REST API access to generate, update and delete QR codes programmatically. See the API Docs for endpoints, rate limits and examples.' },
  { q: 'Do static QR codes ever expire?', a: 'Never. Static QR codes work forever — even on the Free plan, even if you cancel. Only dynamic codes (which use our redirect servers) require an active plan.' },
]

export function PricingView() {
  const navigate = useRouterStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const updatePlan = useAuthStore((s) => s.updatePlan)
  const [cycle, setCycle] = useState<Cycle>('yearly')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [loading, setLoading] = useState<Plan | null>(null)

  const priceFor = (p: Plan) => {
    const base = currency === 'INR' ? PLAN_LIMITS[p].priceInr : PLAN_LIMITS[p].priceUsd
    if (base === 0) return 0
    if (cycle === 'yearly') return Math.round(base * 10) // 2 months free
    return base
  }

  const handleUpgrade = async (p: Plan) => {
    if (!user) {
      navigate('signup', { redirect: 'pricing' })
      return
    }
    if (p === 'free') {
      toast.info('You can downgrade from your billing page')
      navigate('billing')
      return
    }
    setLoading(p)
    try {
      const res = await api.post<{ checkoutUrl: string; message: string }>('/api/billing/upgrade', {
        plan: p,
        currency,
        cycle,
      })
      if (res.checkoutUrl) {
        toast.success('Redirecting to secure checkout…')
        window.location.href = res.checkoutUrl
      } else {
        toast.error('Could not create checkout session.')
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Upgrade failed'
      toast.error(msg)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Header */}
      <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
        <Badge variant="outline" className="mb-3 border-brand/30 text-brand">Pricing</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Free forever. Paid plans that beat the market.
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Unlimited scans on every plan. No watermark. No scan caps.
          <span className="block sm:inline"> Global pricing in USD — INR also available for India.</span>
        </p>
      </div>

      {/* Toggles */}
      <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Tabs value={cycle} onValueChange={(v) => setCycle(v as Cycle)}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">
              Yearly <Badge className="ml-1.5 bg-brand-muted text-brand">-17%</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {(['USD', 'INR'] as const).map((c) => (
            <Toggle
              key={c}
              pressed={currency === c}
              onPressedChange={() => setCurrency(c)}
              className={cn(
                'h-7 px-3 text-xs font-medium',
                currency === c && 'bg-brand text-brand-foreground'
              )}
              data-state={currency === c ? 'on' : 'off'}
            >
              {c === 'USD' ? '$ USD' : '₹ INR'}
            </Toggle>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const price = priceFor(p.id)
          const suffix = p.id === 'free' ? '' : cycle === 'yearly' ? '/yr' : '/mo'
          const symbol = currency === 'USD' ? '$' : '₹'
          return (
            <Card
              key={p.id}
              className={cn(
                'relative flex flex-col rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg',
                p.popular && 'border-brand shadow-lg ring-1 ring-brand/30',
                p.best && 'shadow-md'
              )}
            >
              {p.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-brand-foreground">
                  <Star className="h-3 w-3" /> Popular
                </Badge>
              )}
              {p.best && !p.popular && (
                <Badge variant="outline" className="absolute -top-3 left-1/2 -translate-x-1/2 border-brand/40 bg-background text-brand">
                  Best value
                </Badge>
              )}
              <CardContent className="flex flex-1 flex-col">
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    {symbol}{price.toLocaleString(currency === 'USD' ? 'en-US' : 'en-IN')}
                  </span>
                  <span className="text-sm text-muted-foreground">{suffix}</span>
                </div>
                {p.id !== 'free' && cycle === 'yearly' && (
                  <p className="mt-1 text-xs text-brand">Save 2 months</p>
                )}
                {p.id === 'free' && (
                  <p className="mt-1 text-xs text-brand">Forever free</p>
                )}
                <Button
                  className={cn('mt-5 w-full', (p.popular || p.best) && 'bg-brand text-brand-foreground hover:bg-brand/90')}
                  variant={p.popular || p.best ? 'default' : 'outline'}
                  disabled={loading !== null}
                  onClick={() => handleUpgrade(p.id)}
                >
                  {loading === p.id ? 'Processing...' : p.id === 'free' ? 'Get started' : user ? `Start ${PLAN_LIMITS[p.id].trialDays}-day trial` : 'Sign up'}
                  {p.id !== 'free' && <ArrowRight className="h-4 w-4" />}
                </Button>
                <div className="mt-5 space-y-2.5 text-sm">
                  <PlanFeature highlight>No watermark</PlanFeature>
                  <PlanFeature highlight>PNG & SVG export</PlanFeature>
                  <PlanFeature highlight>
                    <InfinityIcon className="inline h-3.5 w-3.5" /> Unlimited scans
                  </PlanFeature>
                  <PlanFeature highlight={p.id !== 'free'}>
                    {PLAN_LIMITS[p.id].dynamicQr === null ? 'Unlimited' : PLAN_LIMITS[p.id].dynamicQr} dynamic QR
                  </PlanFeature>
                  <PlanFeature highlight={p.id === 'pro' || p.id === 'business'}>
                    Analytics {PLAN_LIMITS[p.id].analyticsDays === null ? 'unlimited' : `${PLAN_LIMITS[p.id].analyticsDays}d`}
                  </PlanFeature>
                  {p.id === 'pro' || p.id === 'business' ? (
                    <PlanFeature highlight>REST API + Bulk</PlanFeature>
                  ) : null}
                  {p.id === 'business' && (
                    <PlanFeature highlight>
                      Team seats: {PLAN_LIMITS[p.id].teamSeats}
                      <Badge variant="outline" className="ml-1.5 align-middle text-[10px] text-muted-foreground">Soon</Badge>
                    </PlanFeature>
                  )}
                  {p.id === 'business' && (
                    <PlanFeature highlight>
                      Custom domain + White-label
                      <Badge variant="outline" className="ml-1.5 align-middle text-[10px] text-muted-foreground">Soon</Badge>
                    </PlanFeature>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Competitor comparison */}
      <div className="mt-16 sm:mt-20">
        <div className="mx-auto mb-6 max-w-2xl text-center">
          <Badge variant="outline" className="mb-3 border-brand/30 text-brand">How we compare</Badge>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Why switch to CreateAnQRCode?</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            We benchmarked the top 5 QR code generators. Here&apos;s where we win.
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Provider</th>
                <th className="px-4 py-3 text-left font-medium">Free plan</th>
                <th className="px-4 py-3 text-left font-medium">Pro from</th>
                <th className="px-4 py-3 text-left font-medium">Scan limits</th>
                <th className="px-4 py-3 text-center font-medium">UPI</th>
                <th className="px-4 py-3 text-center font-medium">Watermark</th>
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c, i) => (
                <tr key={c.name} className={cn(i % 2 === 0 ? 'bg-background' : 'bg-muted/20', c.us && 'bg-brand-muted/30')}>
                  <td className="px-4 py-3 font-semibold">
                    {c.us ? <span className="text-brand">{c.name}</span> : c.name}
                    {c.us && <Badge className="ml-2 bg-brand text-brand-foreground text-[10px]">Us</Badge>}
                  </td>
                  <td className="px-4 py-3">{c.free}</td>
                  <td className="px-4 py-3 font-medium">{c.pro}</td>
                  <td className="px-4 py-3">{c.scans}</td>
                  <td className="px-4 py-3 text-center">
                    {c.upi ? <Check className="mx-auto h-4 w-4 text-brand" /> : <X className="mx-auto h-4 w-4 text-muted-foreground/40" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.watermark ? <X className="mx-auto h-4 w-4 text-destructive/60" /> : <Check className="mx-auto h-4 w-4 text-brand" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Competitor data from public pricing pages, mid-2025. Prices in USD for comparison.
        </p>
      </div>

      {/* Comparison table — all features */}
      <div className="mt-16 sm:mt-20">
        <div className="mx-auto mb-6 max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Compare all features</h2>
          <p className="mt-3 text-sm text-muted-foreground">Every feature, every plan — transparent and upfront.</p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-center font-semibold">
                    {p.name}
                    {p.popular && <Star className="ml-1 inline h-3 w-3 fill-brand text-brand" />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES_MATRIX.map((row, i) => (
                <tr key={row.feature} className={cn(i % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                  <td className="px-4 py-3 font-medium">
                    {row.feature}
                    {row.soon && (
                      <Badge variant="outline" className="ml-1.5 align-middle text-[10px] text-muted-foreground">Soon</Badge>
                    )}
                  </td>
                  {(['free', 'starter', 'pro', 'business'] as const).map((p) => {
                    const v = row[p]
                    return (
                      <td key={p} className="px-4 py-3 text-center">
                        {v === true ? (
                          <Check className="mx-auto h-4 w-4 text-brand" />
                        ) : v === false ? (
                          <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
                        ) : (
                          <span className="font-medium">{v}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust bar */}
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Shield, title: '7-day money back', body: 'Not happy? Get a full refund within 7 days, no questions asked.' },
          { icon: Zap, title: 'Instant activation', body: 'Upgrades take effect immediately. No waiting, no setup fee.' },
          { icon: Sparkles, title: 'Cancel anytime', body: 'No lock-in. Downgrade or cancel from your dashboard in one click.' },
        ].map((t) => (
          <Card key={t.title} className="rounded-2xl">
            <CardContent className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-muted text-brand">
                <t.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-16 max-w-3xl sm:mt-20">
        <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">Pricing FAQ</h2>
        <Accordion type="single" collapsible className="rounded-2xl border border-border px-4">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* CTA */}
      <div className="mt-16 rounded-3xl bg-brand-muted/50 p-8 text-center sm:mt-20 sm:p-12">
        <h2 className="text-2xl font-bold sm:text-3xl">Still not sure which plan?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Start free and upgrade only when you need dynamic codes or analytics. We&apos;ll never charge you without your consent.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate('create')}>
            Create a QR code first <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate('help')}>Talk to support</Button>
        </div>
      </div>
    </div>
  )
}

function PlanFeature({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Check className={cn('h-4 w-4 shrink-0', highlight ? 'text-brand' : 'text-muted-foreground')} />
      <span className="text-foreground/90">{children}</span>
    </div>
  )
}

export default PricingView
