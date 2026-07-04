'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus, Loader2, Sparkles, QrCode as QrCodeIcon, Check, Save, LayoutTemplate,
  Trash2, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { QrPreview } from '@/components/qr-preview'
import { useRouterStore, useAuthStore, useUIStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'
import { DEFAULT_DESIGN, type TemplateRecord, type QrDesign } from '@/lib/types'
import { cn } from '@/lib/utils'

type Category = 'all' | 'business' | 'events' | 'marketing' | 'education' | 'india' | 'custom'

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'business', label: 'Business' },
  { id: 'events', label: 'Events' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'education', label: 'Education' },
  { id: 'india', label: 'India' },
  { id: 'custom', label: 'My Templates' },
]

const CATEGORY_LABEL: Record<string, string> = {
  business: 'Business',
  events: 'Events',
  marketing: 'Marketing',
  education: 'Education',
  india: 'India',
  custom: 'My Templates',
}

const TEMPLATE_PREVIEW_PAYLOAD = 'https://createanqrcode.com'

export function TemplatesView() {
  const navigate = useRouterStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  // Read the QR Studio's current design + logo from the global UI store so
  // "Save current design" actually saves what the user is working on (was
  // always DEFAULT_DESIGN before). Falls back to DEFAULT_DESIGN if the studio
  // has never been opened.
  const studioDesign = useUIStore((s) => s.studioDesign)
  const studioLogoDataUrl = useUIStore((s) => s.studioLogoDataUrl)

  const [category, setCategory] = useState<Category>('all')
  const [saveOpen, setSaveOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [renameTarget, setRenameTarget] = useState<TemplateRecord | null>(null)
  const [renameName, setRenameName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<TemplateRecord | null>(null)

  // The design to save when the user clicks "Save current design". Uses the
  // studio's live design if available, otherwise falls back to DEFAULT_DESIGN.
  const designToSave: QrDesign = studioDesign ?? DEFAULT_DESIGN

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<{ data: TemplateRecord[] }>('/api/templates'),
  })
  const templates = data?.data ?? []

  const saveMut = useMutation({
    mutationFn: () => api.post('/api/templates', { name: newName, design: designToSave }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template saved')
      setSaveOpen(false)
      setNewName('')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed to save template'),
  })

  const renameMut = useMutation({
    mutationFn: () => api.patch(`/api/templates/${renameTarget!.id}`, { name: renameName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template renamed')
      setRenameTarget(null)
      setRenameName('')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed to rename template'),
  })

  const deleteMut = useMutation({
    mutationFn: () => api.del(`/api/templates/${deleteTarget!.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template deleted')
      setDeleteTarget(null)
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed to delete template'),
  })

  function openRename(t: TemplateRecord) {
    setRenameTarget(t)
    setRenameName(t.name)
  }

  const filtered = category === 'all' ? templates : templates.filter((t) => t.category === category)
  const plan = user?.plan ?? 'free'
  const isPaid = plan !== 'free'

  function applyTemplate(t: TemplateRecord) {
    if (t.isPro && !isPaid) {
      navigate('billing')
      return
    }
    navigate('create', { template: t.id })
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start from a pre-made design and customize it — {templates.length} templates available
          </p>
        </div>
        <Button onClick={() => setSaveOpen(true)} variant="outline">
          <Save className="mr-2 h-4 w-4" /> Save current design
        </Button>
      </div>

      {/* Category tabs */}
      <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
        <div className="overflow-x-auto scroll-thin">
          <TabsList className="flex w-max">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="px-3">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col rounded-xl border border-border p-4">
              <div className="mb-3 flex justify-center">
                <div className="skeleton-shimmer aspect-square w-full max-w-[140px] rounded-xl" />
              </div>
              <div className="skeleton-shimmer mb-1 h-5 w-16 rounded" />
              <div className="skeleton-shimmer h-4 w-2/3 rounded" />
              <div className="skeleton-shimmer mt-3 h-8 w-full rounded-md" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-muted text-brand">
              <LayoutTemplate className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No templates here yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {category === 'custom'
                  ? 'Save your favorite designs as templates to reuse them later.'
                  : 'Check back soon — we\'re adding more templates in this category.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((t) => {
            const locked = t.isPro && !isPaid
            return (
              <Card
                key={t.id}
                className="group card-hover relative flex flex-col overflow-hidden border-border"
              >
                {/* PRO badge — top-right corner (monochrome) */}
                {t.isPro && (
                  <span className="absolute right-2 top-2 z-10 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background">
                    PRO
                  </span>
                )}
                {/* Owner-only actions: rename + delete (hidden for system templates) */}
                {!t.isSystem && t.userId && (
                  <div className="absolute left-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label="Rename template"
                      className="grid h-7 w-7 place-items-center rounded-md bg-background/90 text-foreground shadow ring-1 ring-border transition-colors hover:bg-accent"
                      onClick={() => openRename(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete template"
                      className="grid h-7 w-7 place-items-center rounded-md bg-background/90 text-destructive shadow ring-1 ring-border transition-colors hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <CardContent className="flex flex-1 flex-col p-4">
                  <div className="mb-3 flex justify-center">
                    <div className="relative rounded-xl bg-card p-2 shadow-sm ring-1 ring-border">
                      <QrPreview
                        payload={TEMPLATE_PREVIEW_PAYLOAD}
                        design={t.design as QrDesign}
                        size={120}
                      />
                      {/* Hover overlay with "Use Template" CTA */}
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/70 opacity-0 backdrop-blur-[1px] transition-opacity duration-150 group-hover:opacity-100">
                        <span className="text-xs font-medium text-white">Use Template</span>
                      </div>
                    </div>
                  </div>
                  <div className="mb-1 flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {CATEGORY_LABEL[t.category] ?? t.category}
                    </Badge>
                  </div>
                  <h3 className="truncate text-sm font-semibold">{t.name}</h3>

                  <Button
                    size="sm"
                    className={cn('btn-press mt-3 w-full', locked
                      ? 'bg-brand-muted text-brand hover:bg-brand-muted/80'
                      : 'bg-brand text-brand-foreground hover:bg-brand/90')}
                    onClick={() => applyTemplate(t)}
                  >
                    {locked ? (
                      <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Upgrade to Use</>
                    ) : (
                      <><Check className="mr-1.5 h-3.5 w-3.5" /> Use Template</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save template</DialogTitle>
            <DialogDescription>
              {studioDesign
                ? 'Save your current QR Studio design as a reusable template. Customize it further in the QR Studio first.'
                : 'Open the QR Studio, customize your design, then come back here to save it as a template. Saving the default design for now.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-card p-2 shadow-sm ring-1 ring-border">
              <QrPreview payload={TEMPLATE_PREVIEW_PAYLOAD} design={designToSave} logoDataUrl={studioLogoDataUrl} size={88} />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="tplName">Template name</Label>
              <Input
                id="tplName"
                placeholder="e.g. My Brand Colors"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={!newName.trim() || saveMut.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {saveMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename template</DialogTitle>
            <DialogDescription>
              Give this template a new name. Only you can rename templates you own.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="tplRename">Template name</Label>
            <Input
              id="tplRename"
              placeholder="e.g. My Brand Colors"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameName.trim() && !renameMut.isPending) renameMut.mutate()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button
              onClick={() => renameMut.mutate()}
              disabled={!renameName.trim() || renameMut.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {renameMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>.
              QR codes already created from this template are not affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                deleteMut.mutate()
              }}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default TemplatesView
