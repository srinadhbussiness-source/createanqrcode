'use client'

import { Shield, LayoutDashboard, Users, QrCode, CreditCard, ScrollText, Activity, ArrowLeft, LogOut } from 'lucide-react'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV = [
  { view: 'admin-overview', label: 'Overview', icon: LayoutDashboard },
  { view: 'admin-users', label: 'Users', icon: Users },
  { view: 'admin-qr-codes', label: 'QR Codes', icon: QrCode },
  { view: 'admin-payments', label: 'Payments', icon: CreditCard },
  { view: 'admin-audit', label: 'Audit Log', icon: ScrollText },
  { view: 'admin-health', label: 'System Health', icon: Activity },
] as const

export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useRouterStore((s) => s.navigate)
  const view = useRouterStore((s) => s.view)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = async () => {
    try { await api.post('/api/auth/logout', {}) } catch {}
    logout()
    navigate('home')
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card/50 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight">Admin Panel</p>
            <p className="text-[10px] text-muted-foreground">CreateAnQRCode</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <button
              key={item.view}
              onClick={() => navigate(item.view)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                view === item.view ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => navigate('dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to app
          </Button>
          <Button variant="ghost" size="sm" className="mt-1 w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background lg:hidden">
              <Shield className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold">{NAV.find((n) => n.view === view)?.label ?? 'Admin'}</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-muted-foreground sm:block">{user?.email}</p>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'A'}
            </span>
          </div>
        </header>

        {/* Mobile nav */}
        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 no-scrollbar lg:hidden">
          {NAV.map((item) => (
            <button
              key={item.view}
              onClick={() => navigate(item.view)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                view === item.view ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
