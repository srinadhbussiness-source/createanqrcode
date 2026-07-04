'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus, Search, LayoutGrid, List, MoreVertical, Star, Copy, Trash2, Archive,
  FolderInput, Tag, Download, Pencil, QrCode as QrCodeIcon,
  Lock, Eye, Filter, ChevronDown, X, Check, BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { QrPreview } from '@/components/qr-preview'
import { useRouterStore } from '@/lib/stores'
import { api } from '@/lib/api'
import { QR_TYPE_MAP } from '@/lib/qr-types'
import type { QrCodeRecord, FolderRecord } from '@/lib/types'
import { formatDate, formatNumber } from '@/lib/format'
import { downloadQrPng, downloadQrSvg } from '@/lib/qr-generate'
import { cn } from '@/lib/utils'

type SortKey = 'newest' | 'oldest' | 'scans' | 'downloads' | 'updated' | 'az' | 'za'
type StatusFilter = 'all' | 'active' | 'paused' | 'expired' | 'archived' | 'favorites'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-foreground/5 text-foreground border-border' },
  paused: { label: 'Paused', className: 'bg-muted text-muted-foreground border-border' },
  expired: { label: 'Expired', className: 'bg-muted text-muted-foreground border-border' },
  archived: { label: 'Archived', className: 'bg-muted text-muted-foreground border-border' },
  trashed: { label: 'Trashed', className: 'bg-destructive/15 text-destructive border-destructive/30' },
}

export function QrCodesView() {
  const navigate = useRouterStore((s) => s.navigate)
  const params = useRouterStore((s) => s.params)
  const qc = useQueryClient()

  // Filter state
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  // Selection
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['qr-codes'],
    queryFn: () => api.get<{ data: QrCodeRecord[] }>('/api/qr-codes'),
  })
  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.get<{ data: FolderRecord[] }>('/api/folders'),
  })
  const folders = foldersData?.data ?? []
  const codes = data?.data ?? []

  const folderParam = params.folder
  const folderName = folders.find((f) => f.id === folderParam)?.name

  const filtered = useMemo(() => {
    let out = codes
    if (folderParam) out = out.filter((c) => c.folderId === folderParam)
    if (debounced) {
      const q = debounced.toLowerCase()
      out = out.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)) ||
        c.qrType.toLowerCase().includes(q) ||
        // Full-text search by content — users often remember the URL or text
        // the QR points to, not just the title.
        (c.staticPayload ?? '').toLowerCase().includes(q) ||
        (c.destinationUrl ?? '').toLowerCase().includes(q)
      )
    }
    if (typeFilter !== 'all') out = out.filter((c) => c.qrType === typeFilter)
    if (statusFilter === 'favorites') out = out.filter((c) => c.favorite)
    else if (statusFilter !== 'all') out = out.filter((c) => c.status === statusFilter)
    if (from) out = out.filter((c) => c.createdAt >= from)
    if (to) out = out.filter((c) => c.createdAt <= to + 'T23:59:59')
    out = [...out].sort((a, b) => {
      if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt)
      if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt)
      if (sort === 'scans') return b.scanCount - a.scanCount
      if (sort === 'downloads') return b.downloadCount - a.downloadCount
      if (sort === 'updated') return b.updatedAt.localeCompare(a.updatedAt)
      if (sort === 'az') return a.title.localeCompare(b.title)
      if (sort === 'za') return b.title.localeCompare(a.title)
      return 0
    })
    return out
  }, [codes, debounced, typeFilter, statusFilter, from, to, sort, folderParam])

  const selectedIds = Object.keys(selected).filter((k) => selected[k])
  const selectedCount = selectedIds.length
  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length

  function toggleSelect(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }))
  }
  function selectAll() {
    if (allSelected) setSelected({})
    else setSelected(Object.fromEntries(filtered.map((c) => [c.id, true])))
  }
  function clearSelection() { setSelected({}) }

  const bulkMutation = useMutation({
    mutationFn: (vars: { action: 'archive' | 'trash' | 'restore' | 'delete' | 'moveFolder' | 'addTag'; value?: string }) =>
      api.post('/api/qr-codes/bulk', { ids: selectedIds, action: vars.action, value: vars.value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qr-codes'] })
      qc.invalidateQueries({ queryKey: ['folders'] })
      clearSelection()
      toast.success('Bulk action applied')
    },
    onError: () => toast.error('Bulk action failed'),
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      api.patch(`/api/qr-codes/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qr-codes'] }),
    onError: () => toast.error('Update failed'),
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post<{ id: string }>(`/api/qr-codes/${id}/duplicate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qr-codes'] })
      toast.success('QR code duplicated')
    },
    onError: () => toast.error('Duplicate failed'),
  })

  async function handleDownload(code: QrCodeRecord, kind: 'png' | 'svg') {
    try {
      const payload = code.staticPayload || code.destinationUrl || ''
      const filename = code.title.replace(/[^a-z0-9-_]+/gi, '_')
      if (kind === 'png') await downloadQrPng(payload, code.design, code.logoDataUrl, filename)
      else await downloadQrSvg(payload, code.design, code.logoDataUrl, filename)
      toast.success(`Downloading ${kind.toUpperCase()}`)
    } catch {
      toast.error('Download failed')
    }
  }

  function applyAddTag() {
    if (!newTag.trim()) return
    bulkMutation.mutate({ action: 'addTag', value: newTag.trim() })
    setNewTag('')
    setTagDialogOpen(false)
  }
  function applyMoveFolder(folderId: string | null) {
    bulkMutation.mutate({ action: 'moveFolder', value: folderId ?? '' })
    setMoveDialogOpen(false)
  }

  const hasFilters = debounced || typeFilter !== 'all' || statusFilter !== 'all' || from || to

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {folderName ? folderName : 'My QR Codes'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {folderName
              ? `Showing codes in this folder (${filtered.length})`
              : `Manage, organize, and analyze all your QR codes (${filtered.length})`}
          </p>
        </div>
        <Button onClick={() => navigate('studio')} className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="mr-2 h-4 w-4" />
          Create New
        </Button>
      </div>

      {/* Filter bar */}
      {isLoading ? (
        <Card className="border-border">
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="skeleton-shimmer h-9 w-full rounded-md lg:col-span-2" />
              <div className="skeleton-shimmer h-9 w-full rounded-md" />
              <div className="skeleton-shimmer h-9 w-full rounded-md" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="skeleton-shimmer h-9 w-28 rounded-md" />
              <div className="skeleton-shimmer h-9 w-28 rounded-md" />
              <div className="skeleton-shimmer h-9 w-40 rounded-md" />
              <div className="skeleton-shimmer h-9 w-20 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ) : (
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, tag, or type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.values(QR_TYPE_MAP).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="favorites">★ Favorites</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-auto text-xs" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-auto text-xs" />
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); setFrom(''); setTo('') }}>
                  <X className="mr-1 h-3 w-3" /> Clear
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger size="sm" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="updated">Recently updated</SelectItem>
                  <SelectItem value="scans">Most scans</SelectItem>
                  <SelectItem value="downloads">Most downloads</SelectItem>
                  <SelectItem value="az">A → Z</SelectItem>
                  <SelectItem value="za">Z → A</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex overflow-hidden rounded-md border border-border">
                <Button
                  variant={view === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  className={cn('h-9 w-9 rounded-none', view === 'grid' && 'bg-brand text-brand-foreground hover:bg-brand/90')}
                  onClick={() => setView('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  className={cn('h-9 w-9 rounded-none', view === 'list' && 'bg-brand text-brand-foreground hover:bg-brand/90')}
                  onClick={() => setView('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Bulk actions bar */}
      {selectedCount > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-card p-3 shadow-md">
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
            {allSelected ? 'Deselect all' : 'Select all'}
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setMoveDialogOpen(true)}>
            <FolderInput className="mr-1.5 h-3.5 w-3.5" /> Move
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTagDialogOpen(true)}>
            <Tag className="mr-1.5 h-3.5 w-3.5" /> Tag
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkMutation.mutate({ action: 'archive' })}>
            <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkMutation.mutate({ action: 'trash' })}
            className="text-destructive hover:bg-destructive/10">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Trash
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* List / Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex justify-center">
                <div className="skeleton-shimmer aspect-square w-32 rounded-xl" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="skeleton-shimmer h-5 w-12 rounded" />
                <div className="skeleton-shimmer h-5 w-10 rounded" />
              </div>
              <div className="skeleton-shimmer h-4 w-3/4 rounded" />
              <div className="skeleton-shimmer h-3 w-1/2 rounded" />
              <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <div className="skeleton-shimmer h-3 w-16 rounded" />
                <div className="skeleton-shimmer h-3 w-12 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-neutral-100 text-foreground dark:bg-neutral-900">
              <QrCodeIcon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {hasFilters ? 'No codes match your filters' : 'No QR codes yet'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {hasFilters
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Create your first QR code to see it here.'}
              </p>
            </div>
            <Button onClick={() => navigate('studio')} className="btn-press bg-brand text-brand-foreground hover:bg-brand/90">
              <Plus className="mr-2 h-4 w-4" /> Create QR Code
            </Button>
          </CardContent>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <GridCard
              key={c.id}
              code={c}
              selected={!!selected[c.id]}
              onToggleSelect={() => toggleSelect(c.id)}
              onOpen={() => navigate('qr-detail', { id: c.id })}
              onToggleFavorite={() => patchMutation.mutate({ id: c.id, patch: { favorite: !c.favorite } })}
              onDuplicate={() => duplicateMutation.mutate(c.id)}
              onArchive={() => patchMutation.mutate({ id: c.id, patch: { archived: true, status: 'archived' } })}
              onTrash={() => patchMutation.mutate({ id: c.id, patch: { trashed: true, status: 'trashed' } })}
              onDownloadPng={() => handleDownload(c, 'png')}
              onDownloadSvg={() => handleDownload(c, 'svg')}
            />
          ))}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="divide-y divide-border p-0">
            {filtered.map((c) => (
              <ListRow
                key={c.id}
                code={c}
                selected={!!selected[c.id]}
                onToggleSelect={() => toggleSelect(c.id)}
                onOpen={() => navigate('qr-detail', { id: c.id })}
                onToggleFavorite={() => patchMutation.mutate({ id: c.id, patch: { favorite: !c.favorite } })}
                onDuplicate={() => duplicateMutation.mutate(c.id)}
                onArchive={() => patchMutation.mutate({ id: c.id, patch: { archived: true, status: 'archived' } })}
                onTrash={() => patchMutation.mutate({ id: c.id, patch: { trashed: true, status: 'trashed' } })}
                onDownloadPng={() => handleDownload(c, 'png')}
                onDownloadSvg={() => handleDownload(c, 'svg')}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tag dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add tag to {selectedCount} codes</DialogTitle>
            <DialogDescription>Type a tag name. Existing tags will not be duplicated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="newTag">Tag name</Label>
            <Input
              id="newTag"
              placeholder="e.g. marketing, summer-campaign"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyAddTag() } }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>Cancel</Button>
            <Button onClick={applyAddTag} disabled={!newTag.trim()} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Tag className="mr-2 h-4 w-4" /> Add tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move-to-folder dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {selectedCount} codes</DialogTitle>
            <DialogDescription>Choose a destination folder.</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto scroll-thin">
            <button
              onClick={() => applyMoveFolder(null)}
              className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              <span>No folder (unfile)</span>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => applyMoveFolder(f.id)}
                className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="h-3 w-3 rounded-full" style={{ background: f.color }} />
                <span className="flex-1 text-left">{f.name}</span>
                <span className="text-xs text-muted-foreground">{f.count} codes</span>
              </button>
            ))}
            {folders.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                You have no folders yet. Create one from the Folders page.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.active
  return (
    <Badge variant="outline" className={cn('text-[10px]', cfg.className)}>
      {cfg.label}
    </Badge>
  )
}

interface CardActionProps {
  code: QrCodeRecord
  selected: boolean
  onToggleSelect: () => void
  onOpen: () => void
  onToggleFavorite: () => void
  onDuplicate: () => void
  onArchive: () => void
  onTrash: () => void
  onDownloadPng: () => void
  onDownloadSvg: () => void
}

function GridCard(props: CardActionProps) {
  const { code, selected, onToggleSelect, onOpen, onToggleFavorite, onDuplicate, onArchive, onTrash, onDownloadPng, onDownloadSvg } = props
  const typeDef = QR_TYPE_MAP[code.qrType]
  const Icon = typeDef?.icon ?? QrCodeIcon
  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-border card-hover',
        selected && 'ring-2 ring-brand'
      )}
    >
      {/* Top accent — slides in on hover (monochrome) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 origin-left scale-x-0 bg-foreground transition-transform duration-150 group-hover:scale-x-100" />

      <CardContent className="p-4">
        {/* Selection checkbox */}
        <div className="absolute left-3 top-3 z-10 opacity-0 transition-opacity group-hover:opacity-100 data-[checked=true]:opacity-100" data-checked={selected}>
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label="Select code" />
        </div>

        {/* Favorite — smooth scale transition */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
          className="absolute right-3 top-3 z-10 rounded-md p-1 transition-colors hover:bg-accent"
          aria-label="Toggle favorite"
        >
          <Star className={cn(
            'h-4 w-4 transition-transform duration-150 hover:scale-110',
            code.favorite ? 'fill-foreground text-foreground' : 'text-muted-foreground'
          )} />
        </button>

        <div onClick={onOpen} className="cursor-pointer">
          <div className="mb-3 mt-2 flex justify-center">
            <div className="rounded-xl bg-card p-2 shadow-sm ring-1 ring-border">
              <QrPreview
                payload={code.staticPayload || code.destinationUrl || ''}
                design={code.design}
                logoDataUrl={code.logoDataUrl}
                size={120}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Icon className="h-2.5 w-2.5" />
              {typeDef?.label ?? code.qrType}
            </Badge>
            {code.isDynamic && (
              <Badge variant="outline" className="border-brand/40 text-[10px] text-brand">Dyn</Badge>
            )}
            <StatusBadge status={code.status} />
          </div>

          <h3 className="mt-1.5 truncate font-semibold">{code.title}</h3>
          <p className="text-xs text-muted-foreground">{formatDate(code.createdAt)}</p>

          {code.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {code.tags.slice(0, 3).map((t) => (
                <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">#{t}</span>
              ))}
              {code.tags.length > 3 && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">+{code.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Footer — scan count (monochrome) + updated date + 3-dot menu */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex min-w-0 items-center gap-3 text-[10px] text-muted-foreground">
            {code.isDynamic ? (
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" /> {formatNumber(code.scanCount)}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" /> Static
              </span>
            )}
            <span className="truncate">{formatDate(code.updatedAt)}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onOpen}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleFavorite}>
                <Star className="mr-2 h-4 w-4" /> {code.favorite ? 'Unfavorite' : 'Favorite'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDownloadPng}><Download className="mr-2 h-4 w-4" /> Download PNG</DropdownMenuItem>
              <DropdownMenuItem onClick={onDownloadSvg}><Download className="mr-2 h-4 w-4" /> Download SVG</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
              <DropdownMenuItem onClick={onTrash} variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Move to Trash</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

function ListRow(props: CardActionProps) {
  const { code, selected, onToggleSelect, onOpen, onToggleFavorite, onDuplicate, onArchive, onTrash, onDownloadPng, onDownloadSvg } = props
  const typeDef = QR_TYPE_MAP[code.qrType]
  const Icon = typeDef?.icon ?? QrCodeIcon
  return (
    <div className={cn('flex items-center gap-3 p-3 transition-colors hover:bg-accent/50', selected && 'bg-brand-muted/40')}>
      <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label="Select code" />
      <div onClick={onOpen} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <div className="hidden shrink-0 rounded-lg bg-card p-1 ring-1 ring-border sm:block">
          <QrPreview
            payload={code.staticPayload || code.destinationUrl || ''}
            design={code.design}
            logoDataUrl={code.logoDataUrl}
            size={56}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Icon className="h-2.5 w-2.5" />
              {typeDef?.label ?? code.qrType}
            </Badge>
            <StatusBadge status={code.status} />
            {code.isDynamic && (
              <Badge variant="outline" className="border-brand/40 text-[10px] text-brand">Dyn</Badge>
            )}
          </div>
          <p className="mt-0.5 truncate font-semibold">{code.title}</p>
          <p className="text-xs text-muted-foreground">Created {formatDate(code.createdAt)}</p>
        </div>
      </div>
      <button onClick={onToggleFavorite} className="rounded-md p-1.5 hover:bg-accent" aria-label="Toggle favorite">
        <Star className={cn('h-4 w-4', code.favorite ? 'fill-foreground text-foreground' : 'text-muted-foreground')} />
      </button>
      <div className="hidden w-20 text-right text-xs sm:block">
        {code.isDynamic ? (
          <span className="flex items-center justify-end gap-1 text-foreground">
            <Eye className="h-3 w-3" /> {formatNumber(code.scanCount)}
          </span>
        ) : (
          <span className="flex items-center justify-end gap-1 text-muted-foreground">
            <Lock className="h-3 w-3" /> Static
          </span>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={onOpen}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleFavorite}><Star className="mr-2 h-4 w-4" /> {code.favorite ? 'Unfavorite' : 'Favorite'}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDownloadPng}><Download className="mr-2 h-4 w-4" /> Download PNG</DropdownMenuItem>
          <DropdownMenuItem onClick={onDownloadSvg}><Download className="mr-2 h-4 w-4" /> Download SVG</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onArchive}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
          <DropdownMenuItem onClick={onTrash} variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Move to Trash</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default QrCodesView
