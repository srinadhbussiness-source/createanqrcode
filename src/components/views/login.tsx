'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  QrCode as QrCodeIcon, Eye, EyeOff, Loader2, Mail, Lock, ArrowRight,
  ShieldCheck, Sparkles, ArrowLeft, Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator,
} from '@/components/ui/input-otp'
import { useAuthStore, useRouterStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { AuthSidePanel } from '@/components/auth-side-panel'

export function LoginView() {
  const navigate = useRouterStore((s) => s.navigate)
  const params = useRouterStore((s) => s.params)
  const setUser = useAuthStore((s) => s.setUser)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Two-Factor Authentication second-step state. After the password is
  // verified the API returns `{ requiresTwoFactor: true, tempToken }` and we
  // flip into the OTP step.
  const [twoFactorStep, setTwoFactorStep] = useState(false)
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  // Handle Google OAuth redirect: when Supabase redirects back with ?google=true,
  // exchange the Supabase session for our app session.
  useEffect(() => {
    const url = new URLSearchParams(window.location.search)
    const isGoogleRedirect = url.get('google')
    const oauthError = url.get('error')

    // Handle Supabase OAuth errors (e.g. "Database error saving new user")
    if (oauthError) {
      const errorDesc = url.get('error_description') || oauthError
      toast.error(`Google sign-in failed: ${errorDesc}`)
      // Clean the URL
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

        // Get the Supabase session (set by the OAuth redirect)
        const { data: { session }, error } = await sb.auth.getSession()
        if (error || !session) {
          // No session — user may have arrived here without completing OAuth
          toast.error('Google sign-in did not complete. Please try again.')
          setGoogleLoading(false)
          // Clean the URL
          window.history.replaceState({}, '', window.location.pathname)
          return
        }

        // Exchange the Supabase access token for our app session
        const user = await api.post('/api/auth/google', {
          accessToken: session.access_token,
        })
        if (cancelled) return
        setUser(user as Parameters<typeof setUser>[0])
        toast.success('Signed in with Google!')
        navigate('dashboard')
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof ApiError ? err.message : 'Google sign-in failed.'
        toast.error(msg)
        setGoogleLoading(false)
        // Clean the URL
        window.history.replaceState({}, '', window.location.pathname)
      }
    })()

    return () => { cancelled = true }
  }, [navigate, setUser])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter your email and password.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post<{ requiresTwoFactor?: boolean; tempToken?: string } & Record<string, unknown>>(
        '/api/auth/login', { email, password, remember },
      )
      if (res.requiresTwoFactor && res.tempToken) {
        // Step into the 2FA OTP form — don't set the user yet (no cookie was
        // issued). The user can submit the 6-digit code (or a backup code) to
        // /api/auth/login/2fa to complete the login.
        setTempToken(res.tempToken)
        setOtp('')
        setTwoFactorStep(true)
        return
      }
      setUser(res as unknown as Parameters<typeof setUser>[0])
      toast.success('Welcome back!')
      const redirect = params.redirect
      navigate(redirect && redirect !== 'login' ? (redirect as never) : 'dashboard')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handle2faSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tempToken) { toast.error('Session expired — please log in again.'); setTwoFactorStep(false); return }
    if (otp.replace(/\s+/g, '').length < 6) {
      toast.error('Enter the 6-digit code from your authenticator app.')
      return
    }
    setOtpLoading(true)
    try {
      const user = await api.post('/api/auth/login/2fa', { tempToken, token: otp })
      setUser(user as Parameters<typeof setUser>[0])
      toast.success('Welcome back!')
      const redirect = params.redirect
      navigate(redirect && redirect !== 'login' ? (redirect as never) : 'dashboard')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '2FA verification failed.'
      toast.error(msg)
    } finally {
      setOtpLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* LHS — professional branding panel (desktop only) */}
      <AuthSidePanel />

      {/* RHS — login form */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-background px-4 py-12 hero-mesh">
        {googleLoading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm text-muted-foreground">Completing Google sign-in…</p>
        </div>
      ) : (
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Brand — mobile only (desktop shows it on the LHS panel) */}
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
            {twoFactorStep ? (
              <>
                <button
                  onClick={() => { setTwoFactorStep(false); setTempToken(null); setOtp('') }}
                  className="mx-auto mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to login
                </button>
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-muted text-brand">
                  <Shield className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Two-factor authentication</h1>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app, or a backup code.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                <p className="text-sm text-muted-foreground">Sign in to manage your QR codes</p>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4 p-6 pt-2">
            {twoFactorStep ? (
              <form onSubmit={handle2faSubmit} className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(v) => setOtp(v)}
                    autoFocus
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-center text-[11px] text-muted-foreground">
                    Open Google Authenticator, Authy, or 1Password and enter the current code.
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={otpLoading || otp.replace(/\s+/g, '').length < 6}
                  className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {otpLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Verify &amp; sign in
                </Button>
              </form>
            ) : (
              <>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const { getSupabaseClient } = await import('@/lib/supabase-client')
                  const sb = getSupabaseClient()
                  if (!sb) { toast.error('Google sign-in is not configured.'); return }
                  const { error } = await sb.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/login?google=true`,
                    },
                  })
                  if (error) toast.error(error.message)
                } catch { toast.error('Google sign-in failed.') }
              }}
            >
              <GoogleIcon className="mr-2 h-4 w-4" />
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => navigate('reset-password')}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
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
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                />
                <Label htmlFor="remember" className="cursor-pointer text-sm text-muted-foreground">
                  Remember me for 30 days
                </Label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Sign in
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => navigate('signup', { redirect: params.redirect })}
                className="font-semibold text-brand hover:underline"
              >
                Sign up free
              </button>
            </p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Protected by Turnstile
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-brand" /> Free forever
          </span>
        </div>
      </div>
      )}
      </div>
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

export default LoginView
