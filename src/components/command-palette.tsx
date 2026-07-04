'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Plus, QrCode as QrCodeIcon, FolderClosed,
  LayoutTemplate, BarChart3, KeyRound, CreditCard, Settings,
  Home, Globe, Type as TypeIcon, DollarSign, HelpCircle, Search,
  CornerDownLeft, ArrowUp, ArrowDown,
} from 'lucide-react'
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator, CommandShortcut,
} from '@/components/ui/command'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import type { ViewName } from '@/lib/stores'

interface CommandAction {
  label: string
  hint?: string
  icon: typeof Home
  shortcut?: string
  group: string
  run: () => void
  keywords?: string[]
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useRouterStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      // ESC to close is handled by the dialog
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const go = (view: ViewName, params?: Record<string, string>) => {
    navigate(view, params)
    setOpen(false)
  }

  const createType = (typeId: string) => {
    // Navigate to the full-page Studio with the type preset.
    navigate('studio', { type: typeId })
    setOpen(false)
  }

  // Build action list — public + (auth-gated dashboard items if logged in)
  const actions: CommandAction[] = [
    // Navigation
    { label: 'Home', icon: Home, group: 'Navigation', run: () => go('home'), shortcut: 'G H', keywords: ['landing', 'homepage'] },
    { label: 'Create QR Code', icon: Plus, group: 'Navigation', run: () => go('studio'), shortcut: 'G C', keywords: ['generator', 'new'] },
    { label: 'QR Types', icon: Globe, group: 'Navigation', run: () => go('types'), keywords: ['reference', 'all types'] },
    { label: 'Pricing', icon: CreditCard, group: 'Navigation', run: () => go('pricing'), keywords: ['plans', 'billing'] },
    { label: 'API Docs', icon: TypeIcon, group: 'Navigation', run: () => go('docs'), keywords: ['documentation', 'api'] },
    { label: 'Help Center', icon: HelpCircle, group: 'Navigation', run: () => go('help'), keywords: ['support', 'faq'] },
  ]

  if (user) {
    actions.push(
      { label: 'Dashboard', icon: LayoutDashboard, group: 'Dashboard', run: () => go('dashboard'), shortcut: 'G D' },
      { label: 'My QR Codes', icon: QrCodeIcon, group: 'Dashboard', run: () => go('qr-codes'), shortcut: 'G Q', keywords: ['library', 'list'] },
      { label: 'Folders', icon: FolderClosed, group: 'Dashboard', run: () => go('folders'), shortcut: 'G F' },
      { label: 'Templates', icon: LayoutTemplate, group: 'Dashboard', run: () => go('templates'), shortcut: 'G T' },
      { label: 'Analytics', icon: BarChart3, group: 'Dashboard', run: () => go('analytics'), shortcut: 'G A', keywords: ['scans', 'stats'] },
      { label: 'API Keys', icon: KeyRound, group: 'Dashboard', run: () => go('api-keys'), shortcut: 'G K', keywords: ['developer', 'token'] },
      { label: 'Billing', icon: CreditCard, group: 'Dashboard', run: () => go('billing'), shortcut: 'G B', keywords: ['upgrade', 'plan'] },
      { label: 'Settings', icon: Settings, group: 'Dashboard', run: () => go('settings'), shortcut: 'G S', keywords: ['profile', 'account'] },
    )

    // Quick create shortcuts
    actions.push(
      { label: 'Create URL QR', icon: Globe, group: 'Quick Create', run: () => createType('url'), keywords: ['website', 'link'] },
      { label: 'Create WiFi QR', icon: Globe, group: 'Quick Create', run: () => createType('wifi'), keywords: ['network', 'password'] },
      { label: 'Create UPI Payment QR', icon: DollarSign, group: 'Quick Create', run: () => createType('upi'), keywords: ['payment', 'india', 'pay'] },
      { label: 'Create vCard QR', icon: Globe, group: 'Quick Create', run: () => createType('vcard'), keywords: ['contact', 'business card'] },
      { label: 'Create WhatsApp QR', icon: Globe, group: 'Quick Create', run: () => createType('whatsapp'), keywords: ['chat', 'message'] },
    )
  } else {
    actions.push(
      { label: 'Log in', icon: Settings, group: 'Account', run: () => go('login'), keywords: ['signin', 'auth'] },
      { label: 'Sign up free', icon: Plus, group: 'Account', run: () => go('signup'), keywords: ['register', 'create account'] },
    )
  }

  // Group actions
  const groups = actions.reduce<Record<string, CommandAction[]>>((acc, a) => {
    ;(acc[a.group] ??= []).push(a)
    return acc
  }, {})

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groups).map(([groupName, items], idx) => (
            <div key={groupName}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={groupName}>
                {items.map((action) => {
                  const Icon = action.icon
                  return (
                    <CommandItem
                      key={action.label}
                      value={`${action.label} ${action.keywords?.join(' ') ?? ''}`}
                      onSelect={() => action.run()}
                      className="group"
                    >
                      <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground group-aria-selected:text-foreground" />
                      <span className="flex-1">{action.label}</span>
                      {action.shortcut && (
                        <CommandShortcut>{action.shortcut}</CommandShortcut>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </div>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Tips">
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              <span>Press</span>
              <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium">
                <ArrowUp className="h-2.5 w-2.5" /><ArrowDown className="h-2.5 w-2.5" />
              </kbd>
              <span>to navigate,</span>
              <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium">
                <CornerDownLeft className="h-2.5 w-2.5" />
              </kbd>
              <span>to select</span>
            </div>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
