'use client'

import {
  ShieldCheck, Sparkles, Heart, Globe, Users, Code2, Gift,
  ArrowRight, Zap, Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouterStore } from '@/lib/stores'

const PROMISES = [
  {
    icon: Gift,
    title: 'Free forever',
    body: 'Static QR codes are free for everyone, forever. No credit card, no watermark, no catch. We make money from power features — not from holding your codes hostage.',
  },
  {
    icon: Eye,
    title: 'No watermark',
    body: 'Every QR you generate — free or paid — comes out clean. No "Made with..." logos, no ugly badges. Your QR code, your brand.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy first',
    body: 'Your data is yours. We don\'t sell analytics, we don\'t track across sites, we don\'t email-spam. Delete your account anytime and we wipe everything.',
  },
]

const AUDIENCES = [
  { title: 'Small businesses', body: 'Cafes, kirana stores, salons — show menus, accept UPI, share WiFi with a single scan.' },
  { title: 'Freelancers & creators', body: 'vCards, portfolio links, social profiles — make a QR that actually looks like you.' },
  { title: 'Marketing teams', body: 'Dynamic campaigns with scan analytics, A/B destinations, geo-rules, custom domains.' },
  { title: 'Developers', body: 'REST API and webhooks for generating, tracking, and embedding QR codes in your own product.' },
  { title: 'Event organizers', body: 'Conference schedules, wedding invitations, ticketing — update info without reprinting.' },
  { title: 'Educators', body: 'Course links, library catalogs, lab equipment tags — make resources instantly accessible.' },
]

const VALUES = [
  { icon: Heart, title: 'Craft over speed', body: 'We ship fewer things but polish them. Every QR type, every UI tweak, every line of API code gets reviewed by a human who cares.' },
  { icon: Zap, title: 'Fast by default', body: 'Page loads under a second. QR generation in under 200ms. We obsess over performance because your time matters.' },
  { icon: Globe, title: 'Built for the world', body: 'UPI for India. WhatsApp for Latin America. SMS for feature phones. We design for the markets that actually scan QR codes.' },
  { icon: Users, title: 'Customer-obsessed', body: 'Every support ticket is read by a founder in the first 24 hours. Roadmap items come from real user requests, not boardroom guesses.' },
]

const TEAM = [
  { initials: 'PS', name: 'Priya Sharma', role: 'Founder & CEO' },
  { initials: 'AM', name: 'Arjun Mehta', role: 'Engineering' },
  { initials: 'RK', name: 'Riya Kapoor', role: 'Design' },
  { initials: 'KV', name: 'Karthik Venkat', role: 'Product' },
]

export function AboutView() {
  const navigate = useRouterStore((s) => s.navigate)

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      {/* Hero */}
      <section className="relative overflow-hidden hero-mesh rounded-3xl border border-border/60 p-8 sm:p-14">
        <div className="absolute inset-0 dot-grid opacity-20" />
        <div className="relative mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-4 border-brand/30 text-brand">Our story</Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            We make QR codes that{' '}
            <span className="text-brand">people actually want to scan</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            CreateAnQRCode started in 2024 with one frustration: every free QR generator either
            watermarked the result, charged for basic features, or hid scan analytics behind a
            paywall. We set out to fix that — beautifully.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate('create')}>
              Create a QR code <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate('pricing')}>See pricing</Button>
          </div>
        </div>
      </section>

      {/* Three promises */}
      <section className="mt-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="outline" className="mb-3 border-brand/30 text-brand">Three promises</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What we commit to</h2>
          <p className="mt-3 text-muted-foreground">
            These three principles guide every product decision we make.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {PROMISES.map((p) => (
            <Card key={p.title} className="rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardContent>
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand-muted text-brand">
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="mt-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="outline" className="mb-3 border-brand/30 text-brand">Who it's for</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for everyone who scans</h2>
          <p className="mt-3 text-muted-foreground">
            From a kirana store in Mumbai to a SaaS company in Berlin — we serve 180+ countries.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((a) => (
            <Card key={a.title} className="rounded-2xl bg-card/50">
              <CardContent>
                <h3 className="text-base font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="mt-20 rounded-3xl bg-card/50 p-8 sm:p-12">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Badge variant="outline" className="mb-3 border-brand/30 text-brand">Values</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How we work</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="flex gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-muted text-brand">
                <v.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{v.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="mt-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Badge variant="outline" className="mb-3 border-brand/30 text-brand">Team</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Small team, big ambitions</h2>
          <p className="mt-3 text-muted-foreground">
            We're a remote-first team of four. We've all been on the other side — scanning broken,
            watermarked, ugly QR codes. That's why we're here.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((t) => (
            <Card key={t.name} className="rounded-2xl text-center">
              <CardContent>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-muted text-lg font-semibold text-brand">
                  {t.initials}
                </div>
                <p className="mt-4 font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.role}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* By the numbers */}
      <section className="mt-20 rounded-3xl bg-foreground p-8 text-center text-background sm:p-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">By the numbers</h2>
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { value: '2.4M+', label: 'QR codes created' },
            { value: '180+', label: 'countries' },
            { value: '8.1M', label: 'scans tracked' },
            { value: '99.9%', label: 'uptime' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-foreground sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-background/70">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-brand" />
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Join 2.4M+ creators
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Create your first QR code in under a minute. Free forever — no credit card.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate('signup')}>
            Get started free <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate('create')}>Just make a QR code</Button>
        </div>
      </section>
    </div>
  )
}

export default AboutView
