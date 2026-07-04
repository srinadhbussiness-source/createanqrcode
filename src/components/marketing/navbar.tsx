'use client'

import { useState } from 'react'
import { Menu, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetClose, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'QR Types', view: 'types' as const },
  { label: 'Pricing', view: 'pricing' as const },
  { label: 'Blog', view: 'blog' as const },
  { label: 'API Docs', view: 'docs' as const },
  { label: 'Help', view: 'help' as const },
]

/** Filled black/white 8px square logo mark + wordmark — pure monochrome */
function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      {/* Filled square — inverts with theme */}
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

export function MarketingNavbar() {
  const navigate = useRouterStore((s) => s.navigate)
  const current = useRouterStore((s) => s.view)
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)

  const go = (view: Parameters<typeof navigate>[0]) => {
    navigate(view)
    setOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <button onClick={() => go('home')} className="shrink-0">
          <Logo />
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <button
              key={l.view}
              onClick={() => go(l.view)}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                current === l.view
                  ? 'text-foreground'
                  : 'text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              )}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
            }}
            className="hidden items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-foreground dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 sm:flex"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search...</span>
            <kbd className="inline-flex h-4 items-center rounded border border-neutral-300 bg-white px-1 font-mono text-[10px] font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950">⌘K</kbd>
          </button>
          <ThemeToggle />
          {user ? (
            <Button onClick={() => go('dashboard')} size="sm" className="hidden sm:inline-flex">
              Dashboard
            </Button>
          ) : (
            <>
              <Button onClick={() => go('login')} variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log in
              </Button>
              <Button onClick={() => go('signup')} size="sm" className="hidden sm:inline-flex">
                Get Started Free
              </Button>
            </>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4 dark:border-neutral-800">
                <Logo />
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Close menu"><X className="h-4 w-4" /></Button>
                </SheetClose>
              </div>
              <nav className="mt-4 flex flex-col gap-1">
                {NAV_LINKS.map((l) => (
                  <SheetClose asChild key={l.view}>
                    <Button onClick={() => go(l.view)} variant="ghost" className="justify-start">
                      {l.label}
                    </Button>
                  </SheetClose>
                ))}
                <div className="my-2 h-px bg-neutral-200 dark:bg-neutral-800" />
                {user ? (
                  <SheetClose asChild>
                    <Button onClick={() => go('dashboard')}>Go to Dashboard</Button>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button onClick={() => go('login')} variant="outline">Log in</Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button onClick={() => go('signup')}>Get Started Free</Button>
                    </SheetClose>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
