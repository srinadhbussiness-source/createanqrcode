'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Key, Zap, Shield, Book, List, AlertTriangle, ArrowRight, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouterStore } from '@/lib/stores'

const SECTIONS = [
  { id: 'auth', label: 'Authentication', icon: Shield },
  { id: 'rate-limits', label: 'Rate Limits', icon: Zap },
  { id: 'endpoints', label: 'Endpoints', icon: List },
  { id: 'design', label: 'Design Object', icon: Book },
  { id: 'errors', label: 'Error Codes', icon: AlertTriangle },
]

function CodeBlock({ title, code, lang = 'bash' }: { title?: string; code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Copy failed')
    }
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{title || lang}</span>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
        >
          <Copy className="h-3 w-3" /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function DocsView() {
  const navigate = useRouterStore((s) => s.navigate)
  const [active, setActive] = useState('auth')

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Badge variant="outline" className="mb-3 border-brand/30 text-brand">API Reference</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">CreateAnQRCode API</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Generate, manage and track QR codes programmatically. The API is RESTful, returns JSON,
          and uses Bearer token authentication.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Sidebar TOC */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active === s.id ? 'bg-brand-muted text-brand font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <s.icon className="h-4 w-4" />
                {s.label}
              </a>
            ))}
          </nav>
          <Card className="mt-6 rounded-2xl border-brand/30 bg-brand-muted/30">
            <CardContent className="text-sm">
              <p className="font-medium text-brand">Need an API key?</p>
              <p className="mt-1 text-xs text-muted-foreground">Available on Pro & Business plans.</p>
              <Button size="sm" className="mt-3 bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate('api-keys')}>
                <Key className="h-3.5 w-3.5" /> Get API key
              </Button>
            </CardContent>
          </Card>
        </aside>

        {/* Content */}
        <div className="space-y-12">
          {/* AUTH */}
          <section id="auth" className="scroll-mt-20">
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
              <Shield className="h-5 w-5 text-brand" /> Authentication
            </h2>
            <p className="mb-4 text-muted-foreground">
              All API requests must include a Bearer token in the <code className="rounded bg-muted px-1 py-0.5 text-sm">Authorization</code> header.
              Generate an API key from your dashboard.
            </p>
            <CodeBlock
              title="Header format"
              code={`Authorization: Bearer qac_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
            />
          </section>

          {/* RATE LIMITS */}
          <section id="rate-limits" className="scroll-mt-20">
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
              <Zap className="h-5 w-5 text-brand" /> Rate Limits
            </h2>
            <p className="mb-4 text-muted-foreground">
              Rate limits depend on your plan. Limits are per-minute and per-day.
            </p>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Plan</th>
                    <th className="px-4 py-3 text-left font-medium">Per minute</th>
                    <th className="px-4 py-3 text-left font-medium">Per day</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t"><td className="px-4 py-3">Free</td><td className="px-4 py-3">—</td><td className="px-4 py-3 text-muted-foreground">No API</td></tr>
                  <tr className="border-t bg-muted/20"><td className="px-4 py-3">Pro</td><td className="px-4 py-3">60</td><td className="px-4 py-3">10,000</td></tr>
                  <tr className="border-t"><td className="px-4 py-3">Business</td><td className="px-4 py-3">300</td><td className="px-4 py-3">100,000</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Responses include <code className="rounded bg-muted px-1">X-RateLimit-Limit</code>, <code className="rounded bg-muted px-1">X-RateLimit-Remaining</code> and <code className="rounded bg-muted px-1">X-RateLimit-Reset</code> headers.
            </p>
          </section>

          {/* ENDPOINTS */}
          <section id="endpoints" className="scroll-mt-20">
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
              <List className="h-5 w-5 text-brand" /> Endpoints
            </h2>

            <h3 className="mb-2 mt-6 text-lg font-semibold">List QR codes</h3>
            <p className="mb-3 text-sm text-muted-foreground">Returns all QR codes owned by the authenticated user.</p>
            <CodeBlock title="cURL" code={`curl -X GET https://createanqrcode.com/api/v1/qr-codes \\
  -H "Authorization: Bearer qac_live_xxx"`} />
            <p className="mb-2 mt-4 text-sm font-medium">Response (200 OK)</p>
            <CodeBlock title="json" lang="json" code={`{
  "data": [
    {
      "id": "qr_abc123",
      "title": "Summer sale landing",
      "qrType": "url",
      "isDynamic": true,
      "shortCode": "x9Kq2Ab",
      "scanCount": 1243,
      "createdAt": "2025-01-12T09:30:00.000Z"
    }
  ],
  "page": 1,
  "total": 1
}`} />

            <h3 className="mb-2 mt-8 text-lg font-semibold">Create a QR code</h3>
            <p className="mb-3 text-sm text-muted-foreground">Creates a new static or dynamic QR code with a custom design.</p>
            <CodeBlock title="cURL" code={`curl -X POST https://createanqrcode.com/api/v1/qr-codes \\
  -H "Authorization: Bearer qac_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Cafe menu",
    "qrType": "url",
    "isDynamic": true,
    "destinationUrl": "https://example.com/menu",
    "design": {
      "fgColor": "#000000",
      "bgColor": "#FFFFFF",
      "dotStyle": "rounded",
      "eyeStyle": "extra-rounded",
      "errorCorrection": "H",
      "gradientType": "linear",
      "gradientStart": "#000000",
      "gradientEnd": "#52525B",
      "gradientAngle": 45
    }
  }'`} />
            <p className="mb-2 mt-4 text-sm font-medium">Response (201 Created)</p>
            <CodeBlock title="json" lang="json" code={`{
  "id": "qr_def456",
  "title": "Cafe menu",
  "qrType": "url",
  "isDynamic": true,
  "shortCode": "pQ4zL8w",
  "scanUrl": "https://createanqrcode.com/q/pQ4zL8w",
  "destinationUrl": "https://example.com/menu",
  "design": { "fgColor": "#000000", "..." : "..." },
  "createdAt": "2025-01-15T14:22:00.000Z"
}`} />

            <h3 className="mb-2 mt-8 text-lg font-semibold">Update a QR code</h3>
            <CodeBlock title="cURL" code={`curl -X PATCH https://createanqrcode.com/api/v1/qr-codes/qr_def456 \\
  -H "Authorization: Bearer qac_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "destinationUrl": "https://example.com/new-menu" }'`} />

            <h3 className="mb-2 mt-8 text-lg font-semibold">Delete a QR code</h3>
            <CodeBlock title="cURL" code={`curl -X DELETE https://createanqrcode.com/api/v1/qr-codes/qr_def456 \\
  -H "Authorization: Bearer qac_live_xxx"`} />
            <p className="mb-2 mt-4 text-sm font-medium">Response (204 No Content)</p>
            <CodeBlock title="json" lang="json" code={`{}`} />
          </section>

          {/* DESIGN */}
          <section id="design" className="scroll-mt-20">
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
              <Book className="h-5 w-5 text-brand" /> Design Object
            </h2>
            <p className="mb-4 text-muted-foreground">
              The design object controls the visual appearance of a QR code. All fields are optional — defaults are shown below.
            </p>
            <CodeBlock title="design" lang="json" code={`{
  "fgColor": "#000000",          // any hex color
  "bgColor": "#FFFFFF",          // any hex color
  "transparentBg": false,        // bool — overrides bgColor
  "dotStyle": "square",          // square|rounded|dots|classy|classy-rounded|extra-rounded
  "eyeStyle": "square",          // square|extra-rounded|dot
  "errorCorrection": "M",        // L|M|Q|H
  "outputSize": 512,             // 256|512|1024|2048
  "gradientType": "none",        // none|linear|radial
  "gradientStart": "#000000",    // hex — only when gradientType != none
  "gradientEnd": "#52525B",      // hex — only when gradientType != none
  "gradientAngle": 45,           // 0-360 — only for linear
  "logoSize": 20,                // 10-40 (percent of QR size)
  "logoPadding": 5               // 0-20 (px)
}`} />
          </section>

          {/* ERRORS */}
          <section id="errors" className="scroll-mt-20">
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
              <AlertTriangle className="h-5 w-5 text-brand" /> Error Codes
            </h2>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Code</th>
                    <th className="px-4 py-3 text-left font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t"><td className="px-4 py-3 font-mono">400</td><td className="px-4 py-3">bad_request</td><td className="px-4 py-3 text-muted-foreground">Malformed request body or parameters.</td></tr>
                  <tr className="border-t bg-muted/20"><td className="px-4 py-3 font-mono">401</td><td className="px-4 py-3">unauthorized</td><td className="px-4 py-3 text-muted-foreground">Missing or invalid API key.</td></tr>
                  <tr className="border-t"><td className="px-4 py-3 font-mono">403</td><td className="px-4 py-3">forbidden</td><td className="px-4 py-3 text-muted-foreground">Plan limit exceeded or feature not available on your plan.</td></tr>
                  <tr className="border-t bg-muted/20"><td className="px-4 py-3 font-mono">404</td><td className="px-4 py-3">not_found</td><td className="px-4 py-3 text-muted-foreground">Resource does not exist or doesn't belong to you.</td></tr>
                  <tr className="border-t"><td className="px-4 py-3 font-mono">429</td><td className="px-4 py-3">rate_limited</td><td className="px-4 py-3 text-muted-foreground">You've hit the rate limit. Back off and retry.</td></tr>
                  <tr className="border-t bg-muted/20"><td className="px-4 py-3 font-mono">500</td><td className="px-4 py-3">server_error</td><td className="px-4 py-3 text-muted-foreground">Something went wrong on our side. Try again later.</td></tr>
                </tbody>
              </table>
            </div>
            <CodeBlock title="Example error response" lang="json" code={`{
  "error": "Dynamic QR limit reached (5). Upgrade your plan for more.",
  "code": "forbidden",
  "status": 403
}`} />
          </section>

          {/* CTA */}
          <Card className="rounded-2xl border-brand/30 bg-brand-muted/30">
            <CardContent className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div>
                <h3 className="text-lg font-semibold">Ready to build with QR codes?</h3>
                <p className="mt-1 text-sm text-muted-foreground">Generate an API key and start integrating in minutes.</p>
              </div>
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate('api-keys')}>
                <Key className="h-4 w-4" /> Get API key <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DocsView
