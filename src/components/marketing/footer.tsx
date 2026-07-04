'use client'

import { useRouterStore } from '@/lib/stores'

const LINKS = {
  Product: [
    { label: 'QR Types', view: 'types' as const },
    { label: 'Pricing', view: 'pricing' as const },
    { label: 'Create QR', view: 'create' as const },
    { label: 'Templates', view: 'templates' as const },
  ],
  Developers: [
    { label: 'API Docs', view: 'docs' as const },
    { label: 'API Keys', view: 'api-keys' as const },
    { label: 'Bulk Generation', view: 'bulk' as const },
  ],
  Company: [
    { label: 'Help Center', view: 'help' as const },
    { label: 'About', view: 'about' as const },
    { label: 'Blog', view: 'blog' as const },
    { label: 'Changelog', view: 'changelog' as const },
  ],
  Legal: [
    { label: 'Privacy', view: 'help' as const },
    { label: 'Terms', view: 'help' as const },
    { label: 'Security', view: 'help' as const },
  ],
}

function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" />
          <rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" />
          <rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" />
          <rect x="15" y="15" width="3" height="3" fill="currentColor" />
          <rect x="18" y="18" width="3" height="3" fill="currentColor" />
        </svg>
      </span>
      <span className="text-[15px]">CreateAnQRCode</span>
    </span>
  )
}

export function MarketingFooter() {
  const navigate = useRouterStore((s) => s.navigate)
  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <button onClick={() => navigate('home')} className="mb-3 block">
              <Logo />
            </button>
            <p className="max-w-xs text-sm text-muted-foreground">
              Free QR codes. Forever. No watermark, no expiry.
            </p>
          </div>
          {Object.entries(LINKS).map(([heading, items]) => (
            <div key={heading}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{heading}</h3>
              <ul className="space-y-2.5">
                {items.map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={() => navigate(l.view)}
                      className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">© 2025 CreateAnQRCode. Made in India.</p>
          <div className="flex gap-5">
            <button className="text-xs text-muted-foreground transition-colors hover:text-foreground">Privacy</button>
            <button className="text-xs text-muted-foreground transition-colors hover:text-foreground">Terms</button>
            <button className="text-xs text-muted-foreground transition-colors hover:text-foreground">Security</button>
          </div>
        </div>
      </div>
    </footer>
  )
}
