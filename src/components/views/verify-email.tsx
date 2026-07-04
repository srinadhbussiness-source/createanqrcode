'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  QrCode as QrCodeIcon, MailCheck, Loader2, RefreshCw, ArrowLeft, Mail, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'

type VerifyState = 'idle' | 'verifying' | 'verified' | 'error'

export function VerifyEmailView() {
  const navigate = useRouterStore((s) => s.navigate)
  const params = useRouterStore((s) => s.params)
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const email = params.email || user?.email || ''

  const [cooldown, setCooldown] = useState(60)
  const [sending, setSending] = useState(false)
  const [verifyState, setVerifyState] = useState<VerifyState>('idle')
  const [verifyError, setVerifyError] = useState('')

  // Countdown for the resend button.
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Auto-verify if a token is present in the URL (?token=xxx) — this happens
  // when the user clicks the magic link in the verification email.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) return
    let cancelled = false
    setVerifyState('verifying')
    api.post<{ ok: boolean; message: string }>('/api/auth/verify-email', { token })
      .then((res) => {
        if (cancelled) return
        setVerifyState('verified')
        updateUser({ emailVerified: true })
        toast.success(res.message || 'Email verified!')
      })
      .catch((err) => {
        if (cancelled) return
        setVerifyState('error')
        const msg = err instanceof ApiError ? err.message : 'Verification failed.'
        setVerifyError(msg)
        toast.error(msg)
      })
    return () => { cancelled = true }
  }, [updateUser])

  async function handleResend(e: FormEvent) {
    e.preventDefault()
    if (cooldown > 0) return
    setSending(true)
    try {
      const res = await api.post<{ ok: boolean; message: string }>('/api/auth/resend-verification', {})
      toast.success(res.message || 'Verification email sent. Check your inbox.')
      setCooldown(60)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not resend email.'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  // Success state after clicking the magic link.
  if (verifyState === 'verified') {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 hero-mesh">
        <div className="w-full max-w-md animate-fade-in-up">
          <button onClick={() => navigate('home')} className="mx-auto mb-6 flex items-center gap-2 font-bold text-lg">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-brand-foreground shadow-lg shadow-brand/30">
              <QrCodeIcon className="h-5 w-5" />
            </span>
            <span>CreateAnQRCode</span>
          </button>
          <Card className="border-border bg-card/80 shadow-xl backdrop-blur-xl">
            <CardHeader className="space-y-2 px-6 pt-6 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-muted text-brand">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Email verified!</h1>
              <p className="text-sm text-muted-foreground">
                Your email is now confirmed. You&apos;re all set to create and track QR codes.
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <Button className="w-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate('dashboard')}>
                Go to dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error state (invalid/expired token).
  if (verifyState === 'error') {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 hero-mesh">
        <div className="w-full max-w-md animate-fade-in-up">
          <button onClick={() => navigate('home')} className="mx-auto mb-6 flex items-center gap-2 font-bold text-lg">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-brand-foreground shadow-lg shadow-brand/30">
              <QrCodeIcon className="h-5 w-5" />
            </span>
            <span>CreateAnQRCode</span>
          </button>
          <Card className="border-border bg-card/80 shadow-xl backdrop-blur-xl">
            <CardHeader className="space-y-2 px-6 pt-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Link expired</h1>
              <p className="text-sm text-muted-foreground">{verifyError}</p>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-2">
              <Button
                variant="outline"
                className="w-full"
                disabled={cooldown > 0 || sending || !email}
                onClick={handleResend}
              >
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('dashboard')}>
                <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Go to dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Verifying state (loading after clicking the magic link).
  if (verifyState === 'verifying') {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 hero-mesh">
        <div className="w-full max-w-md animate-fade-in-up text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
          <p className="mt-4 text-sm text-muted-foreground">Verifying your email…</p>
        </div>
      </div>
    )
  }

  // Default: "check your inbox" screen.
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 hero-mesh">
      <div className="w-full max-w-md animate-fade-in-up">
        <button
          onClick={() => navigate('home')}
          className="mx-auto mb-6 flex items-center gap-2 font-bold text-lg"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-brand-foreground shadow-lg shadow-brand/30">
            <QrCodeIcon className="h-5 w-5" />
          </span>
          <span>CreateAnQRCode</span>
        </button>

        <Card className="border-border bg-card/80 shadow-xl backdrop-blur-xl">
          <CardHeader className="space-y-2 px-6 pt-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-muted text-brand">
              <MailCheck className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a verification link to{' '}
              <span className="font-semibold text-foreground">{email || 'your email'}</span>.
              Click the link inside to activate your account.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-6 pt-2">
            <form onSubmit={handleResend} className="space-y-3">
              {!email && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={cooldown > 0 || sending || !email}
              >
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend email'}
              </Button>
            </form>

            <div className="space-y-2 pt-2 text-center">
              <p className="text-sm text-muted-foreground">
                Wrong email?{' '}
                <button
                  onClick={() => navigate('signup')}
                  className="font-semibold text-brand hover:underline"
                >
                  Sign up again
                </button>
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => navigate('dashboard')}
              >
                <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                Skip for now — go to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default VerifyEmailView
