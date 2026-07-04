'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Keyboard, CornerDownLeft, ArrowUp, ArrowDown, Search } from 'lucide-react'
import { useRouterStore, useAuthStore } from '@/lib/stores'

// Map of g-prefix navigation shortcuts → view name.
const G_SHORTCUTS: Record<string, Parameters<ReturnType<typeof useRouterStore.getState>['navigate']>[0]> = {
  h: 'home',
  c: 'studio',
  d: 'dashboard',
  q: 'qr-codes',
  f: 'folders',
  t: 'templates',
  a: 'analytics',
  k: 'api-keys',
  b: 'billing',
  s: 'settings',
  // extra convenience (not in the help list but useful)
  p: 'pricing',
  l: 'qr-codes',
}

interface Shortcut {
  keys: string[]
  description: string
  group: string
}

const SHORTCUTS: Shortcut[] = [
  // Global
  { keys: ['⌘', 'K'], description: 'Open command palette', group: 'Global' },
  { keys: ['?'], description: 'Show this shortcuts dialog', group: 'Global' },
  { keys: ['Esc'], description: 'Close dialog / menu', group: 'Global' },
  // Navigation (G + letter)
  { keys: ['G', 'H'], description: 'Go to Home', group: 'Navigation' },
  { keys: ['G', 'C'], description: 'Go to Create QR', group: 'Navigation' },
  { keys: ['G', 'D'], description: 'Go to Dashboard', group: 'Navigation' },
  { keys: ['G', 'Q'], description: 'Go to My QR Codes', group: 'Navigation' },
  { keys: ['G', 'F'], description: 'Go to Folders', group: 'Navigation' },
  { keys: ['G', 'T'], description: 'Go to Templates', group: 'Navigation' },
  { keys: ['G', 'A'], description: 'Go to Analytics', group: 'Navigation' },
  { keys: ['G', 'K'], description: 'Go to API Keys', group: 'Navigation' },
  { keys: ['G', 'B'], description: 'Go to Billing', group: 'Navigation' },
  { keys: ['G', 'S'], description: 'Go to Settings', group: 'Navigation' },
  // Command palette
  { keys: ['↑', '↓'], description: 'Navigate palette items', group: 'Command Palette' },
  { keys: ['↵'], description: 'Select item', group: 'Command Palette' },
  { keys: ['Esc'], description: 'Close palette', group: 'Command Palette' },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-neutral-200 bg-neutral-50 px-1.5 font-mono text-xs font-medium text-foreground dark:border-neutral-800 dark:bg-neutral-900">
      {children}
    </kbd>
  )
}

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // g-prefix state: after pressing 'g', we wait for the next key within a
    // short window. If it matches a shortcut, we navigate. Times out after 800ms.
    let gPending = false
    let gTimer: ReturnType<typeof setTimeout> | null = null

    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement | null
      if (target && typeof target.tagName === 'string') {
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
        if (target.getAttribute && (target.getAttribute('role') === 'textbox' || target.getAttribute('contenteditable') === 'true')) return
      }

      // Help dialog toggle
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setOpen((o) => !o)
        return
      }

      const key = e.key.toLowerCase()
      const navigate = useRouterStore.getState().navigate
      const user = useAuthStore.getState().user

      if (gPending) {
        // We're in the g-pending state — this key completes the sequence.
        if (gTimer) { clearTimeout(gTimer); gTimer = null }
        gPending = false
        const view = G_SHORTCUTS[key]
        if (view) {
          e.preventDefault()
          // Dashboard-only views require auth; redirect to login otherwise.
          const dashboardViews = ['dashboard', 'studio', 'qr-codes', 'qr-detail', 'folders', 'templates', 'bulk', 'analytics', 'api-keys', 'webhooks', 'billing', 'settings']
          if (dashboardViews.includes(view) && !user) {
            navigate('login', { redirect: view })
          } else {
            navigate(view)
          }
        }
        return
      }

      // Start the g-pending sequence on a lone 'g' press.
      if (key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        gPending = true
        gTimer = setTimeout(() => { gPending = false }, 800)
      }
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (gTimer) clearTimeout(gTimer)
    }
  }, [])

  // Group shortcuts
  const groups = SHORTCUTS.reduce<Record<string, Shortcut[]>>((acc, s) => {
    ;(acc[s.group] ??= []).push(s)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster. Press <Kbd>?</Kbd> anytime to open this dialog.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-6 overflow-y-auto scroll-thin py-2">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</h3>
              <div className="space-y-1">
                {items.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <span className="text-sm text-foreground">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <Kbd key={j}>{k}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="border-t border-border pt-4">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Search className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Tip: Open the command palette with <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search and jump to any page or action.
                Use <Kbd><ArrowUp className="inline h-2.5 w-2.5" /></Kbd> <Kbd><ArrowDown className="inline h-2.5 w-2.5" /></Kbd> to navigate and <Kbd><CornerDownLeft className="inline h-2.5 w-2.5" /></Kbd> to select.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
