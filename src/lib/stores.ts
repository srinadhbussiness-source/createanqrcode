'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserRecord, Plan, QrDesign } from '@/lib/types'
import { typeSlug, typeIdFromSlug, QR_TYPE_MAP } from '@/lib/qr-types'

// ---------- Auth Store ----------
interface AuthState {
  user: UserRecord | null
  token: string | null
  hydrated: boolean
  setUser: (u: UserRecord | null, token?: string | null) => void
  logout: () => void
  updatePlan: (plan: Plan, trialEndsAt?: string | null) => void
  updateUser: (patch: Partial<UserRecord>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: false,
      setUser: (u, token) => set({ user: u, token: token ?? null }),
      logout: () => set({ user: null, token: null }),
      updatePlan: (plan, trialEndsAt) =>
        set((s) => (s.user ? { user: { ...s.user, plan, trialEndsAt: trialEndsAt ?? s.user.trialEndsAt } } : {})),
      updateUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : {})),
    }),
    {
      name: 'caqr-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
    }
  )
)

// ---------- Router Store (state-based view routing) ----------
export type ViewName =
  | 'home' | 'create' | 'studio' | 'pricing' | 'types' | 'type-page' | 'docs' | 'blog' | 'changelog' | 'about' | 'help'
  // auth
  | 'login' | 'signup' | 'reset-password' | 'update-password' | 'verify-email'
  // dashboard
  | 'dashboard' | 'qr-codes' | 'qr-detail' | 'folders' | 'templates' | 'bulk'
  | 'analytics' | 'api-keys' | 'webhooks' | 'billing' | 'settings'
  // admin
  | 'admin-overview' | 'admin-users' | 'admin-qr-codes' | 'admin-payments' | 'admin-audit' | 'admin-health'
  // redirect gate
  | 'qr-redirect'

interface RouterState {
  view: ViewName
  params: Record<string, string>
  history: { view: ViewName; params: Record<string, string> }[]
  navigate: (view: ViewName, params?: Record<string, string>) => void
  back: () => void
  canGoBack: () => boolean
  /** Read view + params from the current URL path (used on mount + popstate). */
  syncFromUrl: () => void
}

/** Reserved single-segment view paths (no QR type slug collides — all end in -qr-code). */
const VIEW_PATHS: ViewName[] = [
  'pricing', 'types', 'docs', 'blog', 'changelog', 'about', 'help',
  'login', 'signup', 'reset-password', 'update-password', 'verify-email',
  'studio',
  'dashboard', 'qr-codes', 'qr-detail', 'folders', 'templates', 'bulk',
  'analytics', 'api-keys', 'webhooks', 'billing', 'settings',
  'admin-overview', 'admin-users', 'admin-qr-codes', 'admin-payments', 'admin-audit', 'admin-health',
]

/** Map (view, params) → URL path (with query string for views that need it). */
function viewToPath(view: ViewName, params: Record<string, string>): string {
  if (view === 'home') return '/'
  if (view === 'create') return '/qr-code-generator'
  if (view === 'type-page') {
    const slug = params.type ? typeSlug(params.type) : ''
    return slug ? `/${slug}` : '/types'
  }
  // Studio + qr-detail: append ?id= / ?type= as query params so refresh
  // preserves the edit ID or preset type.
  if (view === 'studio' || view === 'qr-detail') {
    const qs = new URLSearchParams()
    if (params.id) qs.set('id', params.id)
    if (params.type) qs.set('type', params.type)
    const q = qs.toString()
    return q ? `/${view}?${q}` : `/${view}`
  }
  return `/${view}`
}

/** Map URL path → (view, params). */
function pathToView(path: string): { view: ViewName; params: Record<string, string> } {
  if (!path || path === '/') return { view: 'home', params: {} }
  const seg = path.replace(/^\/+|\/+$/g, '').split('/')[0]
  if (!seg) return { view: 'home', params: {} }
  // SEO-friendly create URL
  if (seg === 'qr-code-generator') return { view: 'create', params: {} }
  // QR type slug? (ends in -qr-code)
  if (seg.endsWith('-qr-code')) {
    const typeId = typeIdFromSlug(seg)
    if (typeId) return { view: 'type-page', params: { type: typeId } }
  }
  if ((VIEW_PATHS as string[]).includes(seg)) return { view: seg as ViewName, params: {} }
  return { view: 'home', params: {} }
}

export const useRouterStore = create<RouterState>((set, get) => ({
  view: 'home',
  params: {},
  history: [],
  navigate: (view, params = {}) => {
    const { view: cur, params: curParams, history } = get()
    set({
      view,
      params,
      history: [...history, { view: cur, params: curParams }].slice(-30),
    })
    if (typeof window !== 'undefined') {
      const path = viewToPath(view, params)
      if (window.location.pathname !== path) {
        window.history.pushState({ view, params }, '', path)
      }
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
  },
  back: () => {
    const h = [...get().history]
    const prev = h.pop()
    if (prev) set({ view: prev.view, params: prev.params, history: h })
  },
  canGoBack: () => get().history.length > 0,
  syncFromUrl: () => {
    if (typeof window === 'undefined') return
    // Backward-compat: old ?type=xxx share links → redirect to /{slug} path.
    const qp = new URLSearchParams(window.location.search).get('type')
    if (qp && QR_TYPE_MAP[qp] && !window.location.pathname.endsWith('-qr-code')) {
      if (window.location.pathname === '/' || window.location.pathname === '/qr-code-generator') {
        const slug = typeSlug(qp)
        window.history.replaceState({}, '', `/${slug}`)
      }
    }
    const next = pathToView(window.location.pathname)
    // Merge query params (e.g. ?id=xxx for studio edit mode, ?type=xxx for preset)
    // into the view params so views can read them.
    const searchParams = new URLSearchParams(window.location.search)
    const queryParamKeys = ['id', 'type']
    const mergedParams = { ...next.params }
    for (const key of queryParamKeys) {
      const val = searchParams.get(key)
      if (val) mergedParams[key] = val
    }
    set({ view: next.view, params: mergedParams })
  },
}))

// ---------- UI Store (theme, mobile sidebar, modals, global QR Studio) ----------
interface UIState {
  mobileSidebarOpen: boolean
  setMobileSidebar: (v: boolean) => void
  quickCreateType: string | null
  setQuickCreateType: (t: string | null) => void
  signupPromptOpen: boolean
  setSignupPrompt: (v: boolean) => void
  // Global QR Studio overlay — rendered by DashboardShell so the LHS sidebar
  // stays visible while generating. Opening the studio does NOT navigate away
  // from the current dashboard view.
  studioOpen: boolean
  studioType: string | null
  /** When set, the Studio opens in EDIT mode — it loads this QR by id and
   *  PATCHes on save instead of POSTing a new one. */
  studioEditId: string | null
  openStudio: (type?: string) => void
  openStudioEdit: (qrId: string) => void
  closeStudio: () => void
  // The QR Studio's current design + logo — synced from qr-studio.tsx via a
  // useEffect so other views (e.g. Templates → "Save current design") can read
  // the user's actual in-progress design instead of DEFAULT_DESIGN.
  studioDesign: QrDesign | null
  studioLogoDataUrl: string | null
  setStudioDesign: (design: QrDesign, logo: string | null) => void
}
export const useUIStore = create<UIState>((set) => ({
  mobileSidebarOpen: false,
  setMobileSidebar: (v) => set({ mobileSidebarOpen: v }),
  quickCreateType: null,
  setQuickCreateType: (t) => set({ quickCreateType: t }),
  signupPromptOpen: false,
  setSignupPrompt: (v) => set({ signupPromptOpen: v }),
  studioOpen: false,
  studioType: null,
  studioEditId: null,
  openStudio: (type) => set({ studioOpen: true, studioType: type ?? null, quickCreateType: type ?? null, studioEditId: null }),
  openStudioEdit: (qrId) => set({ studioOpen: true, studioEditId: qrId, studioType: null, quickCreateType: null }),
  closeStudio: () => set({ studioOpen: false, studioEditId: null }),
  studioDesign: null,
  studioLogoDataUrl: null,
  setStudioDesign: (design, logo) => set({ studioDesign: design, studioLogoDataUrl: logo }),
}))
