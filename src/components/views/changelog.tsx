'use client'

import { Sparkles, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useRouterStore } from '@/lib/stores'

interface ChangelogEntry {
  version: string
  date: string
  type: 'New' | 'Improved' | 'Fixed' | 'Security'
  title: string
  items: string[]
}

const ENTRIES: ChangelogEntry[] = [
  {
    version: '3.2.0', date: '2025-07-01', type: 'Security', title: 'Phase 1 security hardening',
    items: [
      'Replaced single-pass SHA-256 password hashing with bcrypt (cost 12).',
      'Added CSRF protection via Origin-check middleware on all cookie-auth mutating routes.',
      'Rate limiting on login, password-reset, QR password-gate, scan-logging and the v1 API.',
      'Scan logging now happens behind the password gate — failed attempts no longer inflate counts.',
      'Trashed & archived QR codes no longer redirect publicly.',
      'Real IP hashing with a daily salt (the spec\'s architectural guarantee) — unique-visitor analytics now work.',
      'Logout now revokes the server-side session row.',
      'QR passwords are hashed server-side with bcrypt (was client-trusted).',
    ],
  },
  {
    version: '3.1.0', date: '2025-06-30', type: 'New', title: 'Phase 2 — dead buttons fixed',
    items: [
      'Real sessions list + revoke in Settings (replaced MOCK_SESSIONS).',
      'Working change-password flow (verifies current password, invalidates other sessions).',
      'Sign-out-all-others now calls the real revoke-all API.',
      'Printable HTML invoices for every payment.',
      'Real usage stats on the Billing card (was hardcoded mock).',
      'Working help-center search + category filtering.',
      'Real support-ticket submission with attachment support.',
      'All 10 g-prefix keyboard shortcuts (G H/C/D/Q/F/T/A/K/B/S) now functional.',
    ],
  },
  {
    version: '3.0.0', date: '2025-06-28', type: 'New', title: '80+ QR types with dedicated SEO pages',
    items: [
      'Expanded from 20 to 83 QR types across 11 categories.',
      'Each type now has its own refresh-safe URL (e.g. /wifi-network-qr-code) with per-type SEO title, meta, how-to and FAQ.',
      'New types: crypto (Bitcoin/Ethereum), video-call (Zoom/Meet/Teams), 16 social platforms, 10 payment methods, and more.',
      'Category-organized Types directory with search and filter.',
    ],
  },
  {
    version: '2.4.0', date: '2025-06-25', type: 'Improved', title: 'Competitive pricing overhaul',
    items: [
      'New plan limits to beat the market: 10 dynamic QR on Free (was 5), unlimited scans on every plan.',
      'Pro $12/mo (was $15) with 250 dynamic QR + UPI dynamic payments.',
      'Business $29/mo (was $35) with 10 team seats + white-label.',
      'New competitor-comparison table on the pricing page.',
    ],
  },
  {
    version: '2.3.0', date: '2025-06-22', type: 'Improved', title: 'Mobile-first redesign',
    items: [
      'Create view: sticky live preview + tabbed Content/Design/Dynamic panels on mobile.',
      'Removed the unprofessional rotated QR mockup from the hero; replaced with a professional showcase.',
      'Mobile-first utilities (no-scrollbar, safe-area, snap-scroll, tap-none).',
      'Single-render layout (useSyncExternalStore desktop detection) — no double QR render.',
    ],
  },
  {
    version: '2.2.0', date: '2025-06-18', type: 'Fixed', title: 'Scan-redirect route + bug fixes',
    items: [
      'Moved /q/[code] from page.tsx to route.ts (Next 16 was throwing 500).',
      'Dynamic-QR limit count now includes trashed codes (prevents trash-bypass).',
      'Folder-ownership checks added to bulk + QR PATCH routes.',
    ],
  },
  {
    version: '2.1.0', date: '2025-06-15', type: 'New', title: 'Command palette + keyboard shortcuts',
    items: [
      'Cmd/Ctrl+K command palette with fuzzy search and nav shortcuts.',
      'Keyboard-shortcuts help dialog (press ?).',
      'QR scan-simulation phone-mockup preview.',
      'Loading skeletons (shimmer) across 5 views.',
    ],
  },
  {
    version: '2.0.0', date: '2025-06-10', type: 'New', title: 'Initial public launch',
    items: [
      'Full QR generator with 20 types, customizer (colors, dots, eyes, gradient, logo), PNG + SVG export.',
      'Auth (email/password), dashboard, QR library, folders, templates.',
      'Dynamic QR codes with short URLs, password protection, expiry, scan caps.',
      'Analytics (charts, real-time feed, heatmap, CSV export).',
      'Bulk generation wizard (CSV → ZIP).',
      'REST API v1 with API keys.',
      'Billing (4 plans), settings, help center, docs.',
    ],
  },
]

const TYPE_STYLES: Record<ChangelogEntry['type'], string> = {
  New: 'border-brand/30 text-brand',
  Improved: 'border-foreground/20 text-foreground',
  Fixed: 'border-foreground/20 text-muted-foreground',
  Security: 'border-destructive/40 text-destructive',
}

export function ChangelogView() {
  const navigate = useRouterStore((s) => s.navigate)
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <Badge variant="outline" className="mb-3 border-brand/30 text-brand">Changelog</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">What&apos;s new</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Every improvement, fix and launch — newest first.
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {ENTRIES.map((e) => (
          <Card key={e.version} className="rounded-2xl">
            <CardContent className="p-6">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Badge variant="outline" className={TYPE_STYLES[e.type]}>{e.type}</Badge>
                <span className="font-mono text-sm font-semibold">v{e.version}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-lg font-bold tracking-tight">{e.title}</h2>
              <ul className="mt-3 space-y-1.5">
                {e.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 rounded-3xl bg-brand-muted/50 p-8 text-center sm:p-10">
        <Sparkles className="mx-auto h-8 w-8 text-brand" />
        <h2 className="mt-3 text-xl font-bold">Have a feature request?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          We ship based on user feedback. Tell us what you&apos;d like to see next.
        </p>
        <button
          onClick={() => navigate('help')}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          <Tag className="h-3.5 w-3.5" /> Submit feedback
        </button>
      </div>
    </div>
  )
}

export default ChangelogView
