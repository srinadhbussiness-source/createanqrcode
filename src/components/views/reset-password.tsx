'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  QrCode as QrCodeIcon, Mail, Loader2, ArrowLeft, ArrowRight, MailCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouterStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'

export function ResetPasswordView() {
  const navigate = useRouterStore((s) => s.navigate)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email address.')
      return
    }
    setLoading(true)
    try {
      await api.post('/api/auth/reset-request', { email })
      setSent(true)
      toast.success('Reset link sent (if account exists).')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Request failed.'
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
          {sent ? (
            <>
              <CardHeader className="space-y-2 px-6 pt-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-muted text-brand">
                  <MailCheck className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
                <p className="text-sm text-muted-foreground">
                  If an account exists for <span className="font-semibold text-foreground">{email}</span>, we&apos;ve sent a password reset link. The link expires in 1 hour.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('login')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => setSent(false)}
                >
                  Didn&apos;t get the email? Try a different address
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-2 px-6 pt-6 text-center">
                <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we&apos;ll send you a secure link to reset your password.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 p-6 pt-2">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
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
                    Send reset link
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  Remembered your password?{' '}
                  <button
                    onClick={() => navigate('login')}
                    className="font-semibold text-brand hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

export default ResetPasswordView
