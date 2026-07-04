'use client'

import { useState, useMemo, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, Rocket, QrCode, Zap, BarChart3, CreditCard, Code2,
  HelpCircle, Send, Paperclip, Clock, Loader2, X, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'

const CATEGORIES = [
  { icon: Rocket, title: 'Getting started', body: 'Account setup, first QR code, billing basics.', count: 12, keywords: 'signup login account first create' },
  { icon: QrCode, title: 'QR types', body: 'Choosing the right type and what each payload looks like.', count: 18, keywords: 'url wifi vcard upi type social' },
  { icon: Zap, title: 'Dynamic codes', body: 'Edit destinations, scan tracking, password protection.', count: 9, keywords: 'dynamic redirect edit destination password expiry' },
  { icon: BarChart3, title: 'Analytics', body: 'Reading scan data, exports, top sources.', count: 7, keywords: 'analytics scans statistics export chart' },
  { icon: CreditCard, title: 'Billing', body: 'Plans, upgrades, refunds, invoices, taxes.', count: 11, keywords: 'billing payment invoice refund plan upgrade' },
  { icon: Code2, title: 'API', body: 'Authentication, endpoints, rate limits, webhooks.', count: 14, keywords: 'api key endpoint rate limit webhook rest' },
]

const FAQS = [
  { q: 'What is a static QR code vs a dynamic QR code?', a: 'A static QR code encodes the data directly into the image — it can\'t be changed once printed. A dynamic QR code stores a short redirect URL, so you can change the destination anytime and track scans.', cat: 'Dynamic codes' },
  { q: 'Do I need an account to create a QR code?', a: 'No. You can create and download unlimited static QR codes without signing up. You only need an account to save codes, use dynamic links, and view analytics.', cat: 'Getting started' },
  { q: 'Are there watermarks on free QR codes?', a: 'Never. Every QR code you generate — free or paid — is clean. No "Made with..." branding, no logos.', cat: 'Getting started' },
  { q: 'What file formats can I download?', a: 'PNG (raster, great for printing) and SVG (vector, scales infinitely). PDF export is on our roadmap — coming soon.', cat: 'QR types' },
  { q: 'Can I add my logo to a QR code?', a: 'Yes. Upload a PNG or SVG logo in the Customizer panel. Use error correction level Q or H when adding a logo so the code stays scannable.', cat: 'QR types' },
  { q: 'Why is my QR code not scanning?', a: 'Common causes: (1) too much data for the error correction level — switch to L or M; (2) low contrast between foreground and background; (3) logo too large — keep it under 25% of QR size; (4) low print resolution — export at 1024px or higher.', cat: 'QR types' },
  { q: 'How do dynamic QR codes work?', a: 'When you create a dynamic QR, we generate a short URL like createanqrcode.com/q/x9Kq2Ab. The QR encodes that short URL. When scanned, our server looks up the destination and redirects — recording the scan with metadata.', cat: 'Dynamic codes' },
  { q: 'Can I edit a dynamic QR destination after printing?', a: 'Yes — that\'s the whole point. Open the QR in your dashboard, change the destination URL, and save. All existing prints will instantly redirect to the new location.', cat: 'Dynamic codes' },
  { q: 'What scan analytics are available?', a: 'Time of scan, country, city (approximate), device type, OS, browser, language, and referrer. Pro plans keep 365 days; Business keeps unlimited.', cat: 'Analytics' },
  { q: 'Can I password-protect a dynamic QR?', a: 'Yes. When creating or editing a dynamic QR, set a password. Scanners will see a password prompt before being redirected. Passwords are hashed with bcrypt server-side.', cat: 'Dynamic codes' },
  { q: 'Can I set an expiry or scan limit on a dynamic QR?', a: 'Yes. Set an expiry date and/or a max scan count. After the limit is reached, scanners see a friendly "expired" message instead of the destination.', cat: 'Dynamic codes' },
  { q: 'How do I cancel my subscription?', a: 'Go to Dashboard → Billing → Cancel subscription. Your plan remains active until the end of the billing period, then you drop to Free. You keep all your QR codes.', cat: 'Billing' },
  { q: 'Do you offer refunds?', a: 'Yes — a 7-day money-back guarantee on all paid plans. Contact support within 7 days of payment for a full refund.', cat: 'Billing' },
  { q: 'How does the bulk generator work?', a: 'Upload a CSV with one row per QR code. Map columns to QR type fields. We generate all codes and download as a ZIP of PNGs plus a manifest CSV. Pro: 1,000/batch, Business: 5,000/batch.', cat: 'QR types' },
  { q: 'Is there an API?', a: 'Yes. Pro and Business plans get REST API access. See the API docs page for endpoints, authentication, and rate limits (60 req/min per key).', cat: 'API' },
  { q: 'How do I get an API key?', a: 'Go to Dashboard → API Keys → Create new key. The full key is shown only once — store it securely. You can create read-only or read+write keys.', cat: 'API' },
  { q: 'What are the API rate limits?', a: '60 requests per minute per API key, with X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers on every response. Exceeding the limit returns HTTP 429.', cat: 'API' },
  { q: 'Can I download an invoice for my payment?', a: 'Yes. Go to Dashboard → Billing → Payment history, and click the "Invoice" button next to any payment. A printable invoice opens in a new tab — use your browser\'s Print → Save as PDF.', cat: 'Billing' },
]

const RESPONSE_TIMES = [
  { plan: 'Free', channel: 'Email', time: '48 hours', priority: 'Normal' },
  { plan: 'Starter', channel: 'Email', time: '24 hours', priority: 'Normal' },
  { plan: 'Pro', channel: 'Email + Chat', time: '8 hours', priority: 'High' },
  { plan: 'Business', channel: 'Email + Chat + Phone', time: '2 hours', priority: 'Critical' },
]

export function HelpView() {
  const navigate = useRouterStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Filter FAQs by search query + active category.
  const filteredFaqs = useMemo(() => {
    return FAQS.filter((f) => {
      if (activeCat && f.cat !== activeCat) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q)
    })
  }, [query, activeCat])

  // Search results also surface matching categories.
  const matchingCats = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return CATEGORIES.filter((c) =>
      c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q) || c.keywords.includes(q))
  }, [query])

  const ticketMut = useMutation({
    mutationFn: (vars: { subject: string; category: string; description: string; attachmentName?: string }) =>
      api.post<{ id: string; message: string }>('/api/support/tickets', vars),
    onSuccess: (res) => {
      toast.success(res.message || `Ticket ${res.id} submitted`)
      setSubject(''); setCategory(''); setDescription(''); setAttachment(null)
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : 'Failed to submit ticket'
      toast.error(msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in subject and description')
      return
    }
    if (!user) {
      toast.error('Please sign in to submit a support ticket')
      navigate('login', { redirect: 'help' })
      return
    }
    ticketMut.mutate({
      subject: subject.trim(),
      category: category || 'General',
      description: description.trim(),
      attachmentName: attachment?.name,
    })
  }

  const onAttach = (file?: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Attachment must be under 5MB')
      return
    }
    setAttachment(file)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero search */}
      <section className="mx-auto mb-14 max-w-3xl text-center">
        <Badge variant="outline" className="mb-3 border-brand/30 text-brand">Help Center</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">How can we help?</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Search our knowledge base, browse categories, or contact support.
        </p>
        <div className="relative mx-auto mt-6 max-w-xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search for articles, e.g. 'dynamic QR' or 'API key'"
            className="h-12 pl-12 text-base"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {/* Categories — clickable, filter the FAQ below */}
      <section className="mb-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Card
              key={c.title}
              className={cn(
                'group cursor-pointer rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg hover:border-brand/40',
                activeCat === c.title && 'border-brand ring-1 ring-brand/30'
              )}
              onClick={() => setActiveCat(activeCat === c.title ? null : c.title)}
            >
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-muted text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                    <c.icon className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary">{c.count}</Badge>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* FAQ — filtered by search + category */}
        <section>
          <div className="mb-6 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-brand" />
              <h2 className="text-2xl font-bold">
                {activeCat ? activeCat : 'Frequently asked questions'}
              </h2>
            </div>
            {(activeCat || query) && (
              <Button variant="ghost" size="sm" onClick={() => { setActiveCat(null); setQuery('') }}>
                Clear filters
              </Button>
            )}
          </div>
          {matchingCats.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {matchingCats.map((c) => (
                <button
                  key={c.title}
                  onClick={() => setActiveCat(c.title)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm hover:border-brand hover:text-brand"
                >
                  <c.icon className="h-3.5 w-3.5" /> {c.title}
                  <ChevronRight className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
          {filteredFaqs.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center">
                <HelpCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No articles match &ldquo;{query}&rdquo;. Try a different search or contact support.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="rounded-2xl border border-border px-4">
              {filteredFaqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </section>

        {/* Contact + SLA */}
        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardContent>
              <h3 className="text-lg font-semibold">Contact support</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {user ? "Can't find an answer? Send us a message — we read every ticket." : 'Sign in to submit a support ticket.'}
              </p>
              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="subj">Subject</Label>
                  <Input
                    id="subj"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of the issue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.title} value={c.title}>{c.title}</SelectItem>
                      ))}
                      <SelectItem value="bug">Bug report</SelectItem>
                      <SelectItem value="account">Account issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    rows={5}
                  />
                </div>
                {attachment && (
                  <div className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{attachment.name}</span>
                    <span className="text-muted-foreground">{(attachment.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.txt,.csv"
                  onChange={(e) => onAttach(e.target.files?.[0])}
                />
                <div className="flex items-center justify-between gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Paperclip className="h-3.5 w-3.5" /> {attachment ? 'Change' : 'Attach'}
                  </Button>
                  <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90" disabled={ticketMut.isPending}>
                    {ticketMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand" />
                <h3 className="text-lg font-semibold">Response times by plan</h3>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Plan</th>
                      <th className="px-3 py-2 text-left font-medium">Channel</th>
                      <th className="px-3 py-2 text-left font-medium">SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RESPONSE_TIMES.map((r) => (
                      <tr key={r.plan} className="border-t">
                        <td className="px-3 py-2 font-medium">{r.plan}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.channel}</td>
                        <td className="px-3 py-2 text-brand">{r.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="link" className="mt-3 h-auto p-0 text-brand" onClick={() => navigate('pricing')}>
                Upgrade for faster support →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-20 rounded-3xl bg-brand-muted/50 p-8 text-center sm:p-12">
        <h2 className="text-2xl font-bold sm:text-3xl">Still stuck?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Our team is here to help. Email us at <a href="mailto:support@createanqrcode.com" className="text-brand underline">support@createanqrcode.com</a> or submit a ticket above.
        </p>
      </div>
    </div>
  )
}

// Local cn helper (avoids an extra import for one usage).
function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default HelpView
