'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { useAuthStore, useRouterStore } from '@/lib/stores'
import { api } from '@/lib/api'
import { MarketingNavbar } from '@/components/marketing/navbar'
import { MarketingFooter } from '@/components/marketing/footer'
import { DashboardShell } from '@/components/dashboard/shell'
import { AdminShell } from '@/components/admin/shell'
import { CommandPalette } from '@/components/command-palette'
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help'
import { Loader2 } from 'lucide-react'

// Marketing views (public)
const HomeView = lazy(() => import('@/components/views/home').then((m) => ({ default: m.HomeView })))
const CreateView = lazy(() => import('@/components/views/create').then((m) => ({ default: m.CreateView })))
const PricingView = lazy(() => import('@/components/views/pricing').then((m) => ({ default: m.PricingView })))
const TypesView = lazy(() => import('@/components/views/types-ref').then((m) => ({ default: m.TypesView })))
const TypePageView = lazy(() => import('@/components/views/type-page').then((m) => ({ default: m.TypePageView })))
const DocsView = lazy(() => import('@/components/views/docs').then((m) => ({ default: m.DocsView })))
const HelpView = lazy(() => import('@/components/views/help').then((m) => ({ default: m.HelpView })))
const AboutView = lazy(() => import('@/components/views/about').then((m) => ({ default: m.AboutView })))
const BlogView = lazy(() => import('@/components/views/blog').then((m) => ({ default: m.BlogView })))
const ChangelogView = lazy(() => import('@/components/views/changelog').then((m) => ({ default: m.ChangelogView })))

// Auth views
const LoginView = lazy(() => import('@/components/views/login').then((m) => ({ default: m.LoginView })))
const SignupView = lazy(() => import('@/components/views/signup').then((m) => ({ default: m.SignupView })))
const ResetPasswordView = lazy(() => import('@/components/views/reset-password').then((m) => ({ default: m.ResetPasswordView })))
const UpdatePasswordView = lazy(() => import('@/components/views/update-password').then((m) => ({ default: m.UpdatePasswordView })))
const VerifyEmailView = lazy(() => import('@/components/views/verify-email').then((m) => ({ default: m.VerifyEmailView })))

// Dashboard views (auth required)
const DashboardView = lazy(() => import('@/components/views/dashboard').then((m) => ({ default: m.DashboardView })))
const StudioView = lazy(() => import('@/components/views/studio').then((m) => ({ default: m.StudioView })))
const QrCodesView = lazy(() => import('@/components/views/qr-codes').then((m) => ({ default: m.QrCodesView })))
const QrDetailView = lazy(() => import('@/components/views/qr-detail').then((m) => ({ default: m.QrDetailView })))
const FoldersView = lazy(() => import('@/components/views/folders').then((m) => ({ default: m.FoldersView })))
const TemplatesView = lazy(() => import('@/components/views/templates').then((m) => ({ default: m.TemplatesView })))
const BulkView = lazy(() => import('@/components/views/bulk').then((m) => ({ default: m.BulkView })))
const AnalyticsView = lazy(() => import('@/components/views/analytics').then((m) => ({ default: m.AnalyticsView })))
const ApiKeysView = lazy(() => import('@/components/views/api-keys').then((m) => ({ default: m.ApiKeysView })))
const BillingView = lazy(() => import('@/components/views/billing').then((m) => ({ default: m.BillingView })))
const SettingsView = lazy(() => import('@/components/views/settings').then((m) => ({ default: m.SettingsView })))
const WebhooksView = lazy(() => import('@/components/views/webhooks').then((m) => ({ default: m.WebhooksView })))

// Admin views (admin-only)
const AdminOverview = lazy(() => import('@/components/admin/overview').then((m) => ({ default: m.AdminOverview })))
const AdminUsers = lazy(() => import('@/components/admin/users').then((m) => ({ default: m.AdminUsers })))
const AdminQrCodes = lazy(() => import('@/components/admin/qr-codes').then((m) => ({ default: m.AdminQrCodes })))
const AdminPayments = lazy(() => import('@/components/admin/payments').then((m) => ({ default: m.AdminPayments })))
const AdminAudit = lazy(() => import('@/components/admin/audit').then((m) => ({ default: m.AdminAudit })))
const AdminHealth = lazy(() => import('@/components/admin/health').then((m) => ({ default: m.AdminHealth })))

const PUBLIC_VIEWS = ['home', 'create', 'pricing', 'types', 'type-page', 'docs', 'blog', 'changelog', 'help', 'about']
const AUTH_VIEWS = ['login', 'signup', 'reset-password', 'update-password', 'verify-email']
const DASHBOARD_VIEWS = ['dashboard', 'studio', 'qr-codes', 'qr-detail', 'folders', 'templates', 'bulk', 'analytics', 'api-keys', 'webhooks', 'billing', 'settings']
const ADMIN_VIEWS = ['admin-overview', 'admin-users', 'admin-qr-codes', 'admin-payments', 'admin-audit', 'admin-health']

function Fallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
    </div>
  )
}

export function AppShell() {
  const view = useRouterStore((s) => s.view)
  const navigate = useRouterStore((s) => s.navigate)
  const syncFromUrl = useRouterStore((s) => s.syncFromUrl)
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)
  const setUser = useAuthStore((s) => s.setUser)
  // routeReady prevents a flash of the default view on direct visits/refresh:
  // SSR + first client render show a neutral loader; once syncFromUrl runs we
  // render the view that matches the current URL path.
  const [routeReady, setRouteReady] = useState(false)

  // Hydrate user from server session on first load
  useEffect(() => {
    if (!hydrated) return
    api.get<{ user: unknown }>('/api/auth/me')
      .then((res) => {
        if (res.user) setUser(res.user as Parameters<typeof setUser>[0])
      })
      .catch(() => {})
  }, [hydrated, setUser])

  // URL → view: sync once on mount, and on browser back/forward (popstate).
  useEffect(() => {
    syncFromUrl()
    // Flip routeReady on the next frame (deferred so we don't setState
    // synchronously inside the effect body). Shows a brief loader on direct
    // visits/refresh, then the URL-matched view — no home-page flash.
    const raf = requestAnimationFrame(() => setRouteReady(true))
    const onPop = () => syncFromUrl()
    window.addEventListener('popstate', onPop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('popstate', onPop) }
  }, [syncFromUrl])

  // Guard dashboard views
  useEffect(() => {
    if (hydrated && !user && DASHBOARD_VIEWS.includes(view)) {
      navigate('login', { redirect: view })
    }
    // Admin guard: redirect non-admins away from admin views
    if (hydrated && ADMIN_VIEWS.includes(view) && (!user || (user.role !== 'admin' && user.role !== 'superadmin'))) {
      navigate('dashboard')
    }
    // Redirect away from auth views if already logged in
    if (user && AUTH_VIEWS.includes(view) && view !== 'verify-email') {
      navigate('dashboard')
    }
  }, [hydrated, user, view, navigate])

  const isDashboard = DASHBOARD_VIEWS.includes(view) && user
  const isAdmin = ADMIN_VIEWS.includes(view) && user && (user.role === 'admin' || user.role === 'superadmin')
  const isAuthPage = AUTH_VIEWS.includes(view)
  const isPublic = PUBLIC_VIEWS.includes(view) || (!user && (view === 'qr-codes' || view === 'qr-detail'))

  return (
    <div className="flex min-h-screen flex-col">
      <CommandPalette />
      <KeyboardShortcutsHelp />
      {!routeReady ? (
        <main className="flex-1">
          <Fallback />
        </main>
      ) : isAdmin ? (
        <AdminShell>
          <Suspense fallback={<Fallback />}>{renderAdminView(view)}</Suspense>
        </AdminShell>
      ) : isDashboard ? (
        <DashboardShell>
          <Suspense fallback={<Fallback />}>{renderDashboardView(view)}</Suspense>
        </DashboardShell>
      ) : (
        <>
          {!isAuthPage && <MarketingNavbar />}
          <main className="flex-1">
            <Suspense fallback={<Fallback />}>{renderPublicView(view)}</Suspense>
          </main>
          {!isAuthPage && <MarketingFooter />}
        </>
      )}
    </div>
  )
}

function renderPublicView(view: string) {
  switch (view) {
    case 'home': return <HomeView />
    case 'create': return <CreateView />
    case 'pricing': return <PricingView />
    case 'types': return <TypesView />
    case 'type-page': return <TypePageView />
    case 'docs': return <DocsView />
    case 'blog': return <BlogView />
    case 'changelog': return <ChangelogView />
    case 'help': return <HelpView />
    case 'about': return <AboutView />
    case 'login': return <LoginView />
    case 'signup': return <SignupView />
    case 'reset-password': return <ResetPasswordView />
    case 'update-password': return <UpdatePasswordView />
    case 'verify-email': return <VerifyEmailView />
    default: return <HomeView />
  }
}

function renderDashboardView(view: string) {
  switch (view) {
    case 'dashboard': return <DashboardView />
    case 'studio': return <StudioView />
    case 'qr-codes': return <QrCodesView />
    case 'qr-detail': return <QrDetailView />
    case 'folders': return <FoldersView />
    case 'templates': return <TemplatesView />
    case 'bulk': return <BulkView />
    case 'analytics': return <AnalyticsView />
    case 'api-keys': return <ApiKeysView />
    case 'webhooks': return <WebhooksView />
    case 'billing': return <BillingView />
    case 'settings': return <SettingsView />
    default: return <DashboardView />
  }
}

function renderAdminView(view: string) {
  switch (view) {
    case 'admin-overview': return <AdminOverview />
    case 'admin-users': return <AdminUsers />
    case 'admin-qr-codes': return <AdminQrCodes />
    case 'admin-payments': return <AdminPayments />
    case 'admin-audit': return <AdminAudit />
    case 'admin-health': return <AdminHealth />
    default: return <AdminOverview />
  }
}
