'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  KeyRound, Plus, Loader2, Lock, ArrowRight, Copy, Check, Trash2, BookOpen,
  AlertTriangle, ShieldCheck, Clock, Zap, BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'
import { PLAN_LIMITS, type ApiKeyRecord, type Plan } from '@/lib/types'
import { formatDate, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

interface UsageRow {
  id: string
  name: string
  apiRequests: number
  lastResetAt: string
  lastUsed: string | null
}
interface UsageResponse {
  data: UsageRow[]
  total: number
  limit: number
}

interface CreateKeyResponse extends ApiKeyRecord {
  rawKey: string
}

export function ApiKeysView() {
  const navigate = useRouterStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const plan = (user?.plan ?? 'free') as Plan
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [allowWrite, setAllowWrite] = useState(false)
  const [rawKey, setRawKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')

  const hasAccess = plan === 'pro' || plan === 'business'

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get<{ data: ApiKeyRecord[] }>('/api/api-keys'),
    enabled: hasAccess,
  })
  const keys = data?.data ?? []

  // Real per-key usage stats (replaces the old static "60 req/min · 10,000/day" card).
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['api-keys', 'usage'],
    queryFn: () => api.get<UsageResponse>('/api/api-keys/usage'),
    enabled: hasAccess,
  })
  const usageRows = usageData?.data ?? []
  const usageTotal = usageData?.total ?? 0
  const usageLimit = usageData?.limit ?? 10_000
  const usagePct = usageLimit > 0 ? Math.min(100, Math.round((usageTotal / usageLimit) * 100)) : 0

  const createMut = useMutation({
    mutationFn: () => api.post<CreateKeyResponse>('/api/api-keys', {
      name: keyName.trim(),
      scopes: allowWrite ? 'read,write' : 'read',
    }),
    onSuccess: (res) => {
      setRawKey(res.rawKey)
      setAcknowledged(false)
      setCopied(false)
      setCreateOpen(false)
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API key created')
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : 'Failed to create key'
      toast.error(msg)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del(`/api/api-keys/${id}`),
    onSuccess: () => {
      toast.success('API key revoked')
      setDeleteId(null)
      setDeleteName('')
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: () => toast.error('Failed to revoke key'),
  })

  const closeKeyModal = () => {
    setRawKey(null)
    setKeyName('')
    setAllowWrite(false)
    setAcknowledged(false)
    setCopied(false)
  }

  const copyKey = async () => {
    if (!rawKey) return
    try {
      await navigator.clipboard.writeText(rawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('API key copied to clipboard')
    } catch {
      toast.error('Failed to copy — copy manually')
    }
  }

  // ---------- Access gate ----------
  if (!hasAccess) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Programmatic access to the CreateAnQRCode REST API.
          </p>
        </div>
        <Card className="relative overflow-hidden border-brand/30">
          <CardContent className="p-0">
            <div className="relative">
              <div className="pointer-events-none select-none p-6 blur-sm" aria-hidden>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="mt-3 h-8 w-48 rounded bg-muted" />
                </div>
              </div>
              <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
                <div className="max-w-md p-6 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-muted text-brand">
                    <Lock className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-xl font-bold">API access requires Pro plan or higher</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Generate API keys, automate QR code creation, and integrate with your stack.
                    Pro includes <strong>60 requests/minute · 10,000 requests/day</strong>.
                  </p>
                  <Button
                    onClick={() => navigate('billing')}
                    className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90"
                  >
                    Upgrade to Pro <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------- Main view ----------
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage API keys for programmatic access to CreateAnQRCode.
          </p>
        </div>
        <Button
          onClick={() => { setKeyName(''); setAllowWrite(false); setCreateOpen(true) }}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Plus className="mr-2 h-4 w-4" /> Create New Key
        </Button>
      </div>

      {/* Real usage card */}
      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand" />
              <span className="text-sm font-semibold">API usage this period</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-brand" />
                <strong className="font-medium text-foreground">60</strong> req/min
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                <strong className="font-medium text-foreground">{usageLimit.toLocaleString()}</strong> req/period
              </span>
              <Badge variant="outline" className="border-brand/40 text-brand">
                {plan.charAt(0).toUpperCase() + plan.slice(1)} plan
              </Badge>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                {usageLoading ? 'Loading…' : (
                  <>
                    <span className="text-base font-semibold text-foreground">{usageTotal.toLocaleString()}</span>
                    {' '}/{' '}{usageLimit.toLocaleString()} requests
                  </>
                )}
              </span>
              <span className={cn('text-xs font-medium', usagePct >= 90 ? 'text-destructive' : 'text-muted-foreground')}>
                {usagePct}%
              </span>
            </div>
            <Progress value={usagePct} className="h-2.5" />
          </div>
          {usageRows.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="h-9 text-xs">Key</TableHead>
                    <TableHead className="h-9 text-xs text-right">Requests</TableHead>
                    <TableHead className="h-9 text-xs">Last used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="py-2 text-xs font-medium">{r.name}</TableCell>
                      <TableCell className="py-2 text-right text-xs tabular-nums">{r.apiRequests.toLocaleString()}</TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">
                        {r.lastUsed ? timeAgo(r.lastUsed) : 'Never'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keys list */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Your API keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
            </div>
          ) : keys.length === 0 ? (
            <EmptyState onCreate={() => setCreateOpen(true)} onDocs={() => navigate('docs')} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-xl border border-border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead>Last used</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.name}</TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {k.prefix}…
                          </code>
                        </TableCell>
                        <TableCell>
                          {k.scopes.includes('write') ? (
                            <Badge variant="secondary" className="bg-brand-muted text-brand">Read + Write</Badge>
                          ) : (
                            <Badge variant="secondary">Read only</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {k.lastUsed ? timeAgo(k.lastUsed) : 'Never'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(k.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => { setDeleteId(k.id); setDeleteName(k.name) }}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {keys.map((k) => (
                  <div key={k.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{k.name}</p>
                        <code className="text-xs text-muted-foreground">{k.prefix}…</code>
                      </div>
                      {k.scopes.includes('write') ? (
                        <Badge variant="secondary" className="bg-brand-muted text-brand shrink-0">R+W</Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">Read</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Last used: {k.lastUsed ? timeAgo(k.lastUsed) : 'Never'}</span>
                      <span>{formatDate(k.createdAt)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full text-destructive hover:text-destructive"
                      onClick={() => { setDeleteId(k.id); setDeleteName(k.name) }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Revoke key
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Docs CTA */}
      <Card className="border-dashed border-border">
        <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-muted text-brand">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">View API Documentation</p>
              <p className="text-sm text-muted-foreground">
                Authentication, endpoints, error codes, and code examples.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('docs')}>
            Open docs <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setKeyName(''); setAllowWrite(false) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create new API key</DialogTitle>
            <DialogDescription>
              Give your key a memorable name so you can identify it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key name</Label>
              <Input
                id="key-name"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Production server"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Scopes</Label>
              <div className="space-y-2 rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 cursor-not-allowed opacity-60">
                  <Checkbox checked disabled />
                  <span className="text-sm">Read <span className="text-xs text-muted-foreground">(required)</span></span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={allowWrite}
                    onCheckedChange={(v) => setAllowWrite(v === true)}
                  />
                  <span className="text-sm">Write <span className="text-xs text-muted-foreground">(create / update / delete)</span></span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!keyName.trim() || createMut.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time key reveal modal */}
      <Dialog open={!!rawKey} onOpenChange={(o) => { if (!o && !acknowledged) return; if (!o) closeKeyModal() }}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-brand-muted text-brand">
              <KeyRound className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Copy your API key now</DialogTitle>
            <DialogDescription className="text-center">
              <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                This key will not be shown again.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <code className="block break-all text-xs text-foreground">{rawKey}</code>
            </div>
            <Button
              onClick={copyKey}
              variant={copied ? 'outline' : 'default'}
              className={cn('w-full', !copied && 'bg-brand text-brand-foreground hover:bg-brand/90')}
            >
              {copied ? <><Check className="mr-2 h-4 w-4" /> Copied!</> : <><Copy className="mr-2 h-4 w-4" /> Copy to clipboard</>}
            </Button>
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border p-3">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(v) => setAcknowledged(v === true)}
              />
              <span className="text-sm">I have copied my key and understand I won&apos;t see it again.</span>
            </label>
          </div>
          <DialogFooter>
            <Button
              onClick={closeKeyModal}
              disabled={!acknowledged}
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) { setDeleteId(null); setDeleteName('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke <strong>{deleteName}</strong>. Any application using
              this key will immediately lose access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EmptyState({ onCreate, onDocs }: { onCreate: () => void; onDocs: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-muted text-brand">
        <KeyRound className="h-8 w-8" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">No API keys yet</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Create your first key to start using the CreateAnQRCode REST API.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onCreate} className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="mr-2 h-4 w-4" /> Create your first key
        </Button>
        <Button variant="outline" onClick={onDocs}>
          <BookOpen className="mr-2 h-4 w-4" /> View API Documentation
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default ApiKeysView
