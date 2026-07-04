'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CreditCard, Crown, Check, Star, Loader2, ArrowRight, Calendar, TrendingUp,
  HardDrive, Ban, FileText, ShieldCheck, ChevronRight, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toggle } from '@/components/ui/toggle'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'
import { PLAN_LIMITS, type Plan } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type Cycle = 'monthly' | 'yearly'
type Currency = 'INR' | 'USD'

interface Payment {
  id: string
  plan: Plan
  amount: number
  currency: string
  status: string
  invoiceId: string | null
  createdAt: string
}

const PLANS: { id: Plan; name: string; tagline: string; popular?: boolean }[] = [
  { id: 'starter', name: 'Starter', tagline: 'For small businesses' },
  { id: 'pro', name: 'Pro', tagline: 'For power users & freelancers', popular: true },
  { id: 'business', name: 'Business', tagline: 'For teams & agencies' },
]

const PLAN_FEATURES: Record<Plan, React.ReactNode[]> = {
  free: ['Unlimited static QR codes', '10 dynamic QR codes', 'Unlimited scans', '7-day analytics', 'No watermark'],
  starter: ['Everything in Free', '50 dynamic QR codes', '30-day analytics', 'Password protection & expiry', 'Custom short URLs'],
  pro: ['Everything in Starter', '250 dynamic QR codes', '365-day analytics', 'Bulk generation (1,000/batch)', 'REST API access', 'UPI dynamic payments', 'Priority support'],
  business: [
    'Everything in Pro',
    'Unlimited dynamic QR codes',
    'Unlimited analytics',
    'Bulk generation (5,000/batch)',
    <span key="team" className="inline-flex items-center">
      10 team seats
      <Badge variant="outline" className="ml-1.5 align-middle text-[10px] text-muted-foreground">Soon</Badge>
    </span>,
    <span key="domain" className="inline-flex items-center">
      Custom domain
      <Badge variant="outline" className="ml-1.5 align-middle text-[10px] text-muted-foreground">Soon</Badge>
    </span>,
    <span key="wl" className="inline-flex items-center">
      White-label
      <Badge variant="outline" className="ml-1.5 align-middle text-[10px] text-muted-foreground">Soon</Badge>
    </span>,
    'Dedicated support',
  ],
}

const PLAN_RANK: Record<Plan, number> = { free: 0, starter: 1, pro: 2, business: 3 }

export function BillingView() {
  const navigate = useRouterStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const updatePlan = useAuthStore((s) => s.updatePlan)
  const qc = useQueryClient()

  const plan = user?.plan ?? 'free'
  const limits = PLAN_LIMITS[plan]
  const [cycle, setCycle] = useState<Cycle>('yearly')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [loading, setLoading] = useState<Plan | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  const { data: paymentsData } = useQuery({
    queryKey: ['billing', 'history'],
    queryFn: () => api.get<{ data: Payment[] }>('/api/billing/history'),
  })
  const payments = paymentsData?.data ?? []

  // Trial info
  const trialEndsAt = user?.trialEndsAt
  const trialActive = trialEndsAt && new Date(trialEndsAt) > new Date()
  const trialRemaining = trialActive
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  // Usage (real — fetched from /api/usage)
  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: () => api.get<{
      dynamicUsed: number; dynamicLimit: number | null
      storageUsedMb: number; storageLimitMb: number
      totalCodes: number; totalScans: number
    }>('/api/usage'),
  })
  const dynamicUsed = usage?.dynamicUsed ?? 0
  const dynamicLimit = usage?.dynamicLimit ?? limits.dynamicQr
  const storageUsedMb = usage?.storageUsedMb ?? 0
  const storageLimitMb = usage?.storageLimitMb ?? 50

  const upgradeMut = useMutation({
    mutationFn: (vars: { plan: Plan; currency: Currency; cycle: Cycle }) =>
      api.post<{ checkoutUrl: string; message: string }>('/api/billing/upgrade', vars),
    onSuccess: (res) => {
      if (res.checkoutUrl) {
        toast.success('Redirecting to secure checkout…')
        window.location.href = res.checkoutUrl
      } else {
        toast.error('Could not create checkout session.')
      }
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : 'Upgrade failed'
      toast.error(msg)
    },
  })

  const cancelMut = useMutation({
    mutationFn: () => api.post<{ message: string }>('/api/billing/cancel'),
    onSuccess: (res) => {
      updatePlan('free', null)
      toast.success(res.message || 'Subscription cancelled')
      setCancelOpen(false)
      qc.invalidateQueries({ queryKey: ['billing', 'history'] })
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : 'Failed to cancel'
      toast.error(msg)
    },
  })

  const priceFor = (p: Plan) => {
    const base = currency === 'INR' ? PLAN_LIMITS[p].priceInr : PLAN_LIMITS[p].priceUsd
    if (base === 0) return 0
    if (cycle === 'yearly') return Math.round(base * 10) // 2 months free
    return base
  }

  const handleUpgrade = (p: Plan) => {
    if (PLAN_RANK[p] <= PLAN_RANK[plan]) return
    setLoading(p)
    upgradeMut.mutate(
      { plan: p, currency, cycle },
      { onSettled: () => setLoading(null) }
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Billing & Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription, usage, and payment history.
        </p>
      </div>

      {/* Current plan + Usage */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-brand/30 lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current plan</span>
              <Badge variant="outline" className="gap-1 border-brand/40 text-brand">
                <Crown className="h-3 w-3" /> {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </Badge>
            </div>
            <p className="mt-3 text-2xl font-bold capitalize">
              {plan}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {plan === 'free' ? 'Free forever' : `${formatCurrency(priceFor(plan), currency)}${cycle === 'yearly' ? '/yr' : '/mo'}`}
              </span>
            </p>
            {trialActive && (
              <div className="mt-4 rounded-lg border border-brand/30 bg-brand-muted p-3 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-brand">
                  <Calendar className="h-4 w-4" /> Trial active
                </p>
                <p className="mt-1 text-xs text-brand/80">
                  Trial ends {formatDate(trialEndsAt)} — <strong>{trialRemaining} days remaining</strong>.
                  Add a payment method before trial ends to keep your plan.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs border-brand/40 text-brand"
                  onClick={() => {
                    toast.info('Payment methods are added securely during plan upgrade. Your trial stays active until it ends.')
                    document.getElementById('upgrade-plans')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <CreditCard className="mr-1 h-3 w-3" /> Add payment method
                </Button>
              </div>
            )}
            {plan === 'free' && (
              <p className="mt-4 text-sm text-muted-foreground">
                Upgrade to unlock dynamic QR codes, analytics, bulk generation, and API access.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Usage */}
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Usage this period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <UsageBar
              label="Dynamic QR Codes"
              icon={TrendingUp}
              used={dynamicUsed}
              limit={dynamicLimit}
              format="count"
            />
            <UsageBar
              label="Storage"
              icon={HardDrive}
              used={storageUsedMb}
              limit={storageLimitMb}
              format="mb"
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <UsageStat label="Bulk batch" value={`${PLAN_LIMITS[plan].bulkBatch ?? 0}`} />
              <UsageStat label="Analytics" value={limits.analyticsDays ? `${limits.analyticsDays}d` : 'Unlimited'} />
              <UsageStat label="Team seats" value={`${limits.teamSeats}`} />
              <UsageStat label="API access" value={limits.api ? 'Yes' : 'No'} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade section */}
      {plan !== 'business' && (
        <div id="upgrade-plans">
          <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Upgrade your plan</h2>
              <p className="text-sm text-muted-foreground">7-day trial, no card required.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={cycle} onValueChange={(v) => setCycle(v as Cycle)}>
                <TabsList>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="yearly">
                    Yearly <Badge className="ml-1 bg-brand-muted text-brand text-[10px]">-17%</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                {(['USD', 'INR'] as const).map((c) => (
                  <Toggle
                    key={c}
                    pressed={currency === c}
                    onPressedChange={() => setCurrency(c)}
                    size="sm"
                  >
                    {c}
                  </Toggle>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((p) => {
              const price = priceFor(p.id)
              const isCurrent = p.id === plan
              const isDowngrade = PLAN_RANK[p.id] <= PLAN_RANK[plan]
              const popular = p.popular
              return (
                <Card
                  key={p.id}
                  className={cn(
                    'relative flex flex-col border-border transition-all',
                    popular && 'border-brand shadow-sm lg:scale-[1.02]'
                  )}
                >
                  {popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand text-brand-foreground gap-1">
                      <Star className="h-3 w-3" /> Popular
                    </Badge>
                  )}
                  <CardContent className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">{p.name}</h3>
                      {isCurrent && (
                        <Badge variant="secondary" className="bg-brand-muted text-brand">Current</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.tagline}</p>
                    <div className="mt-4">
                      <span className="text-3xl font-bold tracking-tight">
                        {formatCurrency(price, currency)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {price === 0 ? '' : cycle === 'yearly' ? '/yr' : '/mo'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {price === 0 ? (PLAN_LIMITS[p.id].trialDays ? `${PLAN_LIMITS[p.id].trialDays}-day trial, no card` : 'No trial')
                        : cycle === 'yearly' ? <span className="text-brand">Save 2 months</span> : `${PLAN_LIMITS[p.id].trialDays ?? 0}-day trial, no card`}
                    </p>

                    <ul className="mt-4 flex-1 space-y-2">
                      {PLAN_FEATURES[p.id].map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="mt-5 w-full bg-brand text-brand-foreground hover:bg-brand/90"
                      disabled={isCurrent || isDowngrade || loading !== null}
                      onClick={() => handleUpgrade(p.id)}
                    >
                      {loading === p.id ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                      ) : isCurrent ? (
                        <>Current plan</>
                      ) : isDowngrade ? (
                        <>Lower plan</>
                      ) : (
                        <>Get {p.name} <ArrowRight className="ml-2 h-4 w-4" /></>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Payment history */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <FileText className="h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(p.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize border-brand/40 text-brand">
                          {p.plan}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(p.amount, p.currency === 'USD' ? 'USD' : 'INR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn(
                          'capitalize',
                          p.status === 'paid' && 'bg-foreground/5 text-foreground border-border'
                        )}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => window.open(`/api/billing/invoice/${p.id}`, '_blank')}
                        >
                          <FileText className="mr-1 h-3 w-3" /> Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel subscription */}
      {plan !== 'free' && (
        <Card className="border-border">
          <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Cancel subscription</p>
              <p className="text-sm text-muted-foreground">
                Cancel anytime. You&apos;ll revert to Free at the end of your billing period.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setCancelOpen(true)}
              className="border-destructive/40 text-destructive hover:bg-destructive/5"
            >
              <Ban className="mr-2 h-4 w-4" /> Cancel subscription
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Refund policy */}
      <Card className="border-dashed border-border bg-card">
        <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-muted text-brand">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium">7-day money-back guarantee</p>
              <p className="text-xs text-muted-foreground">
                Paid within the last 7 days? Email <span className="text-brand">support@createanqrcode.com</span> for a full refund.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => navigate('help')}>
            Contact support <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Cancel dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your {plan} subscription?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <span className="space-y-3 block">
                <span>Here&apos;s what happens when you cancel:</span>
                <span className="block">
                  <Info className="mr-1 inline h-3 w-3 text-muted-foreground" />
                  Your static QR codes will keep working forever.
                </span>
                <span className="block">
                  <Info className="mr-1 inline h-3 w-3 text-muted-foreground" />
                  Dynamic QR codes will have a <strong>30-day grace period</strong> before redirects stop.
                </span>
                <span className="block">
                  <Info className="mr-1 inline h-3 w-3 text-muted-foreground" />
                  Analytics data is preserved for <strong>30 days</strong> in case you re-subscribe.
                </span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my plan</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMut.mutate()}
              disabled={cancelMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
              Yes, cancel subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------- Sub components ----------

function UsageBar({
  label, icon: Icon, used, limit, format,
}: {
  label: string
  icon: typeof TrendingUp
  used: number
  limit: number | null
  format: 'count' | 'mb'
}) {
  const unlimited = limit === null
  const pctVal = unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const fmtVal = (n: number) => format === 'mb' ? `${n} MB` : `${n}`
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" /> {label}
        </span>
        <span className="text-xs text-muted-foreground">
          {fmtVal(used)} / {unlimited ? '∞' : fmtVal(limit)}
        </span>
      </div>
      <Progress value={pctVal} className="h-2" />
    </div>
  )
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  )
}

export default BillingView
