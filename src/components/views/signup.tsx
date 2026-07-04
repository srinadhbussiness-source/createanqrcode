'use client'

import { useState, useMemo, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  QrCode as QrCodeIcon, Eye, EyeOff, Loader2, Mail, Lock, User, ArrowRight,
  ShieldCheck, Check, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAuthStore, useRouterStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { AuthSidePanel } from '@/components/auth-side-panel'

interface PasswordChecks {
  length: boolean
  uppercase: boolean
  number: boolean
}

export function SignupView() {
  const navigate = useRouterStore((s) => s.navigate)
  const params = useRouterStore((s) => s.params)
  const setUser = useAuthStore((s) => s.setUser)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Handle Google OAuth redirect: when Supabase redirects back with ?google=true,
  // exchange the Supabase session for our app session.
  useEffect(() => {
    const url = new URLSearchParams(window.location.search)
    const isGoogleRedirect = url.get('google')
    const oauthError = url.get('error')

    if (oauthError) {
      const errorDesc = url.get('error_description') || oauthError
      toast.error(`Google sign-up failed: ${errorDesc}`)
      window.history.replaceState({}, '', window.location.pathname)
      setGoogleLoading(false)
      return
    }

    if (!isGoogleRedirect) return

    let cancelled = false
    setGoogleLoading(true)

    ;(async () => {
      try {
        const { getSupabaseClient } = await import('@/lib/supabase-client')
        const sb = getSupabaseClient()
        if (!sb) { toast.error('Google sign-in is not configured.'); setGoogleLoading(false); return }

        const { data: { session }, error } = await sb.auth.getSession()
        if (error || !session) {
          toast.error('Google sign-up did not complete. Please try again.')
          setGoogleLoading(false)
          window.history.replaceState({}, '', window.location.pathname)
          return
        }

        const user = await api.post('/api/auth/google', {
          accessToken: session.access_token,
        })
        if (cancelled) return
        setUser(user as Parameters<typeof setUser>[0])
        toast.success('Signed up with Google!')
        navigate('dashboard')
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof ApiError ? err.message : 'Google sign-in failed.'
        toast.error(msg)
        setGoogleLoading(false)
        window.history.replaceState({}, '', window.location.pathname)
      }
    })()

    return () => { cancelled = true }
  }, [navigate, setUser])

  const checks: PasswordChecks = useMemo(() => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  }), [password])

  const allValid = checks.length && checks.uppercase && checks.number
  const matches = password === confirm && confirm.length > 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email.')
      return
    }
    if (!allValid) {
      toast.error('Password does not meet the requirements.')
      return
    }
    if (!matches) {
      toast.error('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      // Detect static mode (Cloudflare) vs API mode (local dev)
      const staticRes = await fetch('/api/auth/me', { credentials: 'include' })
      const isStatic = staticRes.status === 404

      if (isStatic) {
        // Firebase Auth (Cloudflare Pages)
        const { getFirebaseAuth } = await import('@/lib/firebase')
        const auth = getFirebaseAuth()
        if (!auth) { toast.error('Auth not configured.'); return }
        const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = await import('firebase/auth')
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        if (name && cred.user) {
          await updateProfile(cred.user, { displayName: name })
        }
        // Send verification email via Firebase
        try {
          await sendEmailVerification(cred.user, {
            url: window.location.origin + '/login',
            handleCodeInApp: true,
          })
          toast.success('Account created! Check your email for verification.')
        } catch {
          toast.success('Account created! Welcome to CreateAnQRCode.')
        }
        const fbUser = cred.user
        setUser({
          id: fbUser.uid, email: fbUser.email ?? '', name: name || fbUser.displayName,
          avatarUrl: fbUser.photoURL, plan: 'free', trialEndsAt: null,
          timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY',
          emailVerified: false, role: 'user', suspended: false,
          twoFactorEnabled: false, notifSecurity: true, notifTrial: true,
          notifScans: true, notifExpiry: true, notifDigest: false, notifUpdates: false,
          createdAt: new Date().toISOString(),
        } as Parameters<typeof setUser>[0])
        navigate('dashboard')
        return
      }

      // API route mode (local dev)
      const user = await api.post('/api/auth/signup', { email, password, name: name || undefined })
      setUser(user as Parameters<typeof setUser>[0])
      toast.success('Account created! Welcome to CreateAnQRCode.')
      navigate('verify-email', { email })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Sign up failed. Please try again.')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* LHS — professional branding panel (desktop only) */}
      <AuthSidePanel />

      {/* RHS — signup form */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-background px-4 py-12 hero-mesh">
        {googleLoading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm text-muted-foreground">Completing Google sign-up…</p>
        </div>
      ) : (
      <div className="w-full max-w-md animate-fade-in-up">
        <button
          onClick={() => navigate('home')}
          className="mx-auto mb-6 flex items-center gap-2 font-bold text-lg lg:hidden"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-brand-foreground shadow-lg shadow-brand/30">
            <QrCodeIcon className="h-5 w-5" />
          </span>
          <span>CreateAnQRCode</span>
        </button>

        <Card className="border-border bg-card/80 shadow-xl backdrop-blur-xl">
          <CardHeader className="space-y-1 px-6 pt-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Create your free account</h1>
            <p className="text-sm text-muted-foreground">
              Generate unlimited static QR codes — no credit card required
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-6 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const staticRes = await fetch('/api/auth/me', { credentials: 'include' })
                  const isStatic = staticRes.status === 404

                  if (isStatic) {
                    // Firebase Google Auth (Cloudflare)
                    const { getFirebaseAuth } = await import('@/lib/firebase')
                    const auth = getFirebaseAuth()
                    if (!auth) { toast.error('Auth not configured.'); return }
                    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
                    const provider = new GoogleAuthProvider()
                    setGoogleLoading(true)
                    const result = await signInWithPopup(auth, provider)
                    const fbUser = result.user
                    setUser({
                      id: fbUser.uid, email: fbUser.email ?? '', name: fbUser.displayName,
                      avatarUrl: fbUser.photoURL, plan: 'free', trialEndsAt: null,
                      timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY',
                      emailVerified: fbUser.emailVerified, role: 'user', suspended: false,
                      twoFactorEnabled: false, notifSecurity: true, notifTrial: true,
                      notifScans: true, notifExpiry: true, notifDigest: false, notifUpdates: false,
                      createdAt: new Date().toISOString(),
                    } as Parameters<typeof setUser>[0])
                    toast.success('Welcome to CreateAnQRCode!')
                    navigate('dashboard')
                  } else {
                    // Local dev — Supabase Google OAuth
                    const { getSupabaseClient } = await import('@/lib/supabase-client')
                    const sb = getSupabaseClient()
                    if (!sb) { toast.error('Google sign-in is not configured.'); return }
                    const { error } = await sb.auth.signInWithOAuth({
                      provider: 'google',
                      options: { redirectTo: `${window.location.origin}/signup?google=true` },
                    })
                    if (error) toast.error(error.message)
                  }
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Google sign-in failed.'
                  toast.error(msg)
                  setGoogleLoading(false)
                }
              }}
            >
              {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
              Continue with Google
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name <span className="text-muted-foreground">(optional)</span></Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Priya Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="space-y-1 pt-1">
                  <Requirement label="At least 8 characters" met={checks.length} />
                  <Requirement label="One uppercase letter (A–Z)" met={checks.uppercase} />
                  <Requirement label="One number (0–9)" met={checks.number} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={cn('pl-9 pr-9', confirm.length > 0 && !matches && 'border-destructive')}
                    required
                  />
                  {confirm.length > 0 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2">
                      {matches
                        ? <Check className="h-4 w-4 text-foreground" />
                        : <X className="h-4 w-4 text-destructive" />}
                    </span>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !allValid || !matches}
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Create Free Account
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={() => navigate('login', { redirect: params.redirect })}
                className="font-semibold text-brand hover:underline"
              >
                Sign in
              </button>
            </p>
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-brand" />
          <span>Protected by Cloudflare Turnstile</span>
        </div>
      </div>
      )}
      </div>
    </div>
  )
}

function Requirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 text-xs transition-colors', met ? 'text-foreground' : 'text-muted-foreground')}>
      <span className={cn('grid h-3.5 w-3.5 place-items-center rounded-full', met ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground')}>
        {met ? <Check className="h-2.5 w-2.5" /> : <span className="h-1 w-1 rounded-full bg-current" />}
      </span>
      {label}
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('h-4 w-4', className)} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

export default SignupView
