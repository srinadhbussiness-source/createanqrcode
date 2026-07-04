'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Webhook as WebhookIcon, Plus, Loader2, Copy, Check, Trash2, AlertTriangle,
  Clock, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { api, ApiError } from '@/lib/api'
import { formatDate, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const EVENT_OPTIONS = ['scan', 'created', 'expired'] as const
type EventOption = typeof EVENT_OPTIONS[number]

interface WebhookRecord {
  id: string
  url: string
  events: string
  active: boolean
  secret: string
  lastDeliveryAt: string | null
  createdAt: string
}

interface CreateResponse extends WebhookRecord {
  secret: string
}

function parseEvents(events: string): EventOption[] {
  const list = (events || 'scan').split(',').map((s) => s.trim()).filter(Boolean)
  return EVENT_OPTIONS.filter((e) => list.includes(e))
}

export function WebhooksView() {
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [hookUrl, setHookUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<EventOption[]>(['scan'])
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteUrl, setDeleteUrl] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.get<{ data: WebhookRecord[] }>('/api/webhooks'),
  })
  const hooks = data?.data ?? []

  const createMut = useMutation({
    mutationFn: () => api.post<CreateResponse>('/api/webhooks', {
      url: hookUrl.trim(),
      events: selectedEvents,
    }),
    onSuccess: (res) => {
      setCreatedSecret(res.secret)
      setSecretCopied(false)
      setCreateOpen(false)
      setHookUrl('')
      setSelectedEvents(['scan'])
      qc.invalidateQueries({ queryKey: ['webhooks'] })
      toast.success('Webhook created')
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : 'Failed to create webhook'
      toast.error(msg)
    },
  })

  const patchMut = useMutation({
    mutationFn: (vars: { id: string; patch: Partial<Pick<WebhookRecord, 'active' | 'events'>> }) =>
      api.patch<WebhookRecord>(`/api/webhooks/${vars.id}`, vars.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] })
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : 'Update failed'
      toast.error(msg)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del(`/api/webhooks/${id}`),
    onSuccess: () => {
      toast.success('Webhook deleted')
      setDeleteId(null)
      setDeleteUrl('')
      qc.invalidateQueries({ queryKey: ['webhooks'] })
    },
    onError: () => toast.error('Failed to delete webhook'),
  })

  function toggleEvent(ev: EventOption, on: boolean) {
    setSelectedEvents((cur) => {
      const set = new Set(cur)
      if (on) set.add(ev); else set.delete(ev)
      return Array.from(set)
    })
  }

  function toggleActive(h: WebhookRecord, on: boolean) {
    patchMut.mutate({ id: h.id, patch: { active: on } })
  }

  function changeEvents(h: WebhookRecord, evs: EventOption[]) {
    patchMut.mutate({ id: h.id, patch: { events: evs.length ? evs.join(',') : 'scan' } })
  }

  function closeSecretModal() {
    setCreatedSecret(null)
    setSecretCopied(false)
  }

  async function copySecret() {
    if (!createdSecret) return
    try {
      await navigator.clipboard.writeText(createdSecret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
      toast.success('Signing secret copied')
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Webhooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Receive HTTP callbacks on your server when QR codes are scanned, created, or expired.
          </p>
        </div>
        <Button
          onClick={() => { setHookUrl(''); setSelectedEvents(['scan']); setCreateOpen(true) }}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Plus className="mr-2 h-4 w-4" /> Create Webhook
        </Button>
      </div>

      {/* Info banner */}
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-muted text-brand">
            <Send className="h-5 w-5" />
          </span>
          <div className="flex-1 text-sm text-muted-foreground">
            Each delivery is a <code className="rounded bg-muted px-1 py-0.5 text-xs">POST</code> with a JSON body
            (<code className="rounded bg-muted px-1 py-0.5 text-xs">{`{ event, deliveredAt, data }`}</code>) and an
            <code className="ml-1 rounded bg-muted px-1 py-0.5 text-xs">X-CreateAnQRCode-Signature</code> header
            containing <code className="ml-1 rounded bg-muted px-1 py-0.5 text-xs">hex(HMAC-SHA256(secret, body))</code>.
            Verify it on your server to confirm the request came from us.
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Your webhooks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
            </div>
          ) : hooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <WebhookIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="font-semibold">No webhooks yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Create your first webhook to receive HTTP callbacks whenever a QR code is scanned.
                </p>
              </div>
              <Button
                onClick={() => { setHookUrl(''); setSelectedEvents(['scan']); setCreateOpen(true) }}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <Plus className="mr-2 h-4 w-4" /> Create your first webhook
              </Button>
            </div>
          ) : (
            hooks.map((h) => {
              const evs = parseEvents(h.events)
              return (
                <div
                  key={h.id}
                  className={cn(
                    'rounded-xl border p-4 transition-colors',
                    h.active ? 'border-border' : 'border-dashed border-border bg-muted/30',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <WebhookIcon className="h-4 w-4 shrink-0 text-brand" />
                        <code className="truncate text-sm font-medium">{h.url}</code>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Created {formatDate(h.createdAt)}
                        </span>
                        <span>Last delivery: {h.lastDeliveryAt ? timeAgo(h.lastDeliveryAt) : '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={h.active ? 'secondary' : 'outline'} className={cn('text-[10px]', h.active && 'bg-brand-muted text-brand')}>
                        {h.active ? 'Active' : 'Paused'}
                      </Badge>
                      <Switch
                        checked={h.active}
                        onCheckedChange={(v) => toggleActive(h, v === true)}
                        disabled={patchMut.isPending}
                        aria-label="Toggle webhook active"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { setDeleteId(h.id); setDeleteUrl(h.url) }}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Events:</span>
                    {EVENT_OPTIONS.map((ev) => {
                      const on = evs.includes(ev)
                      return (
                        <label
                          key={ev}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs"
                        >
                          <Checkbox
                            checked={on}
                            onCheckedChange={(v) => {
                              const set = new Set(evs)
                              if (v) set.add(ev); else set.delete(ev)
                              changeEvents(h, Array.from(set))
                            }}
                          />
                          <span className={cn(on ? 'text-foreground' : 'text-muted-foreground')}>{ev}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setHookUrl(''); setSelectedEvents(['scan']) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create webhook</DialogTitle>
            <DialogDescription>
              Enter the URL we should POST to. You can pick which events to subscribe to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hook-url">Endpoint URL</Label>
              <Input
                id="hook-url"
                value={hookUrl}
                onChange={(e) => setHookUrl(e.target.value)}
                placeholder="https://your-app.com/api/webhooks/createanqrcode"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">Must start with http:// or https://.</p>
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="space-y-2 rounded-lg border border-border p-3">
                {EVENT_OPTIONS.map((ev) => (
                  <label key={ev} className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={selectedEvents.includes(ev)}
                      onCheckedChange={(v) => toggleEvent(ev, v === true)}
                    />
                    <span className="text-sm">{ev}</span>
                    <span className="text-xs text-muted-foreground">
                      {ev === 'scan' && '— fired when a dynamic QR is scanned'}
                      {ev === 'created' && '— fired when a new QR is created (future)'}
                      {ev === 'expired' && '— fired when a QR reaches its expiry (future)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!hookUrl.trim() || selectedEvents.length === 0 || createMut.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time secret reveal */}
      <Dialog open={!!createdSecret} onOpenChange={(o) => { if (!o) closeSecretModal() }}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-brand-muted text-brand">
              <WebhookIcon className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Copy your signing secret</DialogTitle>
            <DialogDescription className="text-center">
              <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                This secret will not be shown again.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use this secret to verify the <code className="rounded bg-muted px-1 py-0.5 text-xs">X-CreateAnQRCode-Signature</code>
              {' '}header on incoming webhook requests. Store it securely — you won&apos;t be able to view it again.
            </p>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <code className="block break-all text-xs text-foreground">{createdSecret}</code>
            </div>
            <Button
              onClick={copySecret}
              variant={secretCopied ? 'outline' : 'default'}
              className={cn('w-full', !secretCopied && 'bg-brand text-brand-foreground hover:bg-brand/90')}
            >
              {secretCopied ? <><Check className="mr-2 h-4 w-4" /> Copied!</> : <><Copy className="mr-2 h-4 w-4" /> Copy to clipboard</>}
            </Button>
          </div>
          <DialogFooter>
            <Button
              onClick={closeSecretModal}
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) { setDeleteId(null); setDeleteUrl('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the webhook at <code className="rounded bg-muted px-1 py-0.5 text-xs">{deleteUrl}</code>.
              Any service expecting callbacks from this URL will stop receiving them. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete webhook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default WebhooksView
