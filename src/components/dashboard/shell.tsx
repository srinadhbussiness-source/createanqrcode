'use client'

import { useState, type ReactNode } from 'react'
import {
  LayoutDashboard, Plus, QrCode as QrCodeIcon, FolderClosed, LayoutTemplate,
  BarChart3, KeyRound, CreditCard, Settings, HelpCircle, Menu, X,
  LogOut, User, ChevronDown, Crown, Sparkles, Search, Keyboard, Webhook,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { api } from '@/lib/api'
import { initials } from '@/lib/format'
import { PLAN_LIMITS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { QrStudio } from '@/components/qr-studio'

interface NavItem {
  label: string
  view: Parameters<ReturnType<typeof useRouterStore.getState>['navigate']>[0]
  icon: typeof LayoutDashboard
  badge?: string
  locked?: boolean
}
interface NavSection {
  title: string
  items: NavItem[]
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const navigate = useRouterStore((s) => s.navigate)
  const current = useRouterStore((s) => s.view)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const [mobileOpen, setMobileOpen] = useState(false)

  const plan = user?.plan ?? 'free'
  const limits = PLAN_LIMITS[plan]

  const sections: NavSection[] = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
        // “Create QR” navigates to the full-page Studio view (like Analytics,
        // Folders, etc.) — NOT a slide-over panel. The LHS sidebar stays as
        // the primary nav.
        { label: 'Create QR', view: 'studio', icon: Plus },
        { label: 'My QR Codes', view: 'qr-codes', icon: QrCodeIcon },
        { label: 'Folders', view: 'folders', icon: FolderClosed },
        { label: 'Templates', view: 'templates', icon: LayoutTemplate },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Analytics', view: 'analytics', icon: BarChart3, locked: plan === 'free', badge: plan === 'free' ? 'Upgrade' : undefined },
      ],
    },
    {
      title: 'Developer',
      items: [
        { label: 'API Keys', view: 'api-keys', icon: KeyRound, locked: !limits.api, badge: !limits.api ? 'Pro+' : undefined },
        { label: 'Webhooks', view: 'webhooks', icon: Webhook },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Billing', view: 'billing', icon: CreditCard },
        { label: 'Settings', view: 'settings', icon: Settings },
        { label: 'Help', view: 'help', icon: HelpCircle },
      ],
    },
  ]

  const go = (view: Parameters<typeof navigate>[0]) => {
    navigate(view)
    setMobileOpen(false)
  }

  const handleLogout = async () => {
    await api.post('/api/auth/logout').catch(() => {})
    logout()
    navigate('home')
    toast.success('Signed out')
  }

  const Sidebar = (
    <nav className="flex h-full flex-col gap-6 p-4">
      <button onClick={() => go('home')} className="flex items-center gap-2 px-2 font-semibold tracking-tight">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <QrCodeIcon className="h-4 w-4" />
        </span>
        <span className="text-[15px]">CreateAnQRCode</span>
      </button>
      <div className="flex-1 space-y-6 overflow-y-auto scroll-thin">
        {sections.map((sec) => (
          <div key={sec.title}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{sec.title}</p>
            <div className="space-y-1">
              {sec.items.map((item) => {
                const active = current === item.view
                const Icon = item.icon
                return (
                  <button
                    key={item.view}
                    onClick={() => go(item.view)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                      active
                        ? 'bg-neutral-100 text-foreground dark:bg-neutral-800'
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-foreground dark:text-neutral-400 dark:hover:bg-neutral-900'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium text-muted-foreground">
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {plan === 'free' && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm font-semibold">Upgrade to Pro</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Dynamic QR codes, analytics, bulk generation & API.</p>
          <Button onClick={() => go('billing')} size="sm" className="mt-3 w-full">
            View Plans
          </Button>
        </div>
      )}
    </nav>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-sidebar lg:block">
        {Sidebar}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="absolute right-3 top-3"><X className="h-4 w-4" /></Button>
          </SheetClose>
          {Sidebar}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="truncate text-base font-semibold capitalize sm:text-lg">
              {current === 'qr-detail' ? 'QR Code' : current.replace(/-/g, ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
              }}
              className="hidden items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-foreground dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 md:flex"
              aria-label="Open command palette"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search...</span>
              <kbd className="inline-flex h-4 items-center rounded border border-neutral-300 bg-white px-1 font-mono text-[10px] font-medium text-muted-foreground dark:border-neutral-700 dark:bg-neutral-950">⌘K</kbd>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="h-[1.2rem] w-[1.2rem]" />
            </Button>
            <ThemeToggle />
            <Badge variant="outline" className="hidden sm:inline-flex font-medium text-muted-foreground">
              {plan !== 'free' && <Crown className="mr-1 h-3 w-3" />}
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-neutral-100 text-foreground text-xs font-semibold dark:bg-neutral-800">
                      {initials(user?.name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user?.name || 'User'}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => go('settings')}><User className="mr-2 h-4 w-4" /> Profile settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => go('settings')}><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => go('billing')}><CreditCard className="mr-2 h-4 w-4" /> Billing</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </div>
      {/* Global QR Studio overlay — available on every dashboard view so the
          LHS sidebar stays visible while generating. Triggered by the sidebar
          “Create QR” item, the dashboard “Create QR Code” button, or quick-create
          chips. */}
      <QrStudio />
    </div>
  )
}
