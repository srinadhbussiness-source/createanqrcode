'use client'

import { useState, useMemo, type FormEvent, useEffect } from 'react'
import { toast } from 'sonner'
import {
  QrCode as QrCodeIcon, Eye, EyeOff, Loader2, Lock, ArrowRight, Check, X, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouterStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface PasswordChecks {
  length: boolean
  uppercase: boolean
  number: boolean
}

export function UpdatePasswordView() {
  const navigate = useRouterStore((s) => s.navigate)
  const params = useRouterStore((s) => s.params)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  // If no token in params, we use a mock token (demo flow)
  const token = params.token || 'demo-mock-token'

  const checks: PasswordChecks = useMemo(() => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  }), [password])

  const allValid = checks.length && checks.uppercase && checks.number
  const matches = password === confirm && confirm.length > 0

  useEffect(() => {
    if (!params.token) {
      toast.info('Demo mode: using a mock reset token. In production this comes from your email link.')
    }
  }, [params.token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
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
      await api.post('/api/auth/reset-confirm', { token, password })
      toast.success('Password updated. Please sign in.')
      navigate('login')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Update failed. The link may be invalid or expired.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

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
          <CardHeader className="space-y-1 px-6 pt-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
            <p className="text-sm text-muted-foreground">
              Choose a strong password you haven&apos;t used before.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-6 pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
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
                <Label htmlFor="confirm">Confirm new password</Label>
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
                Update password
              </Button>
            </form>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              Your new password will be securely hashed
            </div>
          </CardContent>
        </Card>
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

export default UpdatePasswordView
