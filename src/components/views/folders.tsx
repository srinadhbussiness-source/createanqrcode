'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus, Folder as FolderIcon, Loader2, Pencil, Trash2, ArrowRight, Check, X,
  QrCode as QrCodeIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useRouterStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'
import type { FolderRecord } from '@/lib/types'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const FOLDER_COLORS = ['#18181B', '#52525B', '#71717A', '#A1A1AA', '#D4D4D8', '#9CA3AF', '#6B7280', '#404040']

export function FoldersView() {
  const navigate = useRouterStore((s) => s.navigate)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.get<{ data: FolderRecord[] }>('/api/folders'),
  })
  const folders = data?.data ?? []

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(FOLDER_COLORS[0])
  const [deleteTarget, setDeleteTarget] = useState<FolderRecord | null>(null)

  const createMut = useMutation({
    mutationFn: () => api.post<FolderRecord>('/api/folders', { name: newName, color: newColor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] })
      toast.success('Folder created')
      setCreateOpen(false)
      setNewName('')
      setNewColor(FOLDER_COLORS[0])
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed to create folder'),
  })

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; name: string; color: string }) =>
      api.patch(`/api/folders/${vars.id}`, { name: vars.name, color: vars.color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] })
      toast.success('Folder updated')
      setEditingId(null)
    },
    onError: () => toast.error('Update failed'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del(`/api/folders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] })
      qc.invalidateQueries({ queryKey: ['qr-codes'] })
      toast.success('Folder deleted — codes are now unfiled')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Delete failed'),
  })

  function startEdit(f: FolderRecord) {
    setEditingId(f.id)
    setEditName(f.name)
    setEditColor(f.color)
  }
  function saveEdit() {
    if (!editingId || !editName.trim()) return
    updateMut.mutate({ id: editingId, name: editName.trim(), color: editColor })
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Folders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize your QR codes into folders for easier access ({folders.length})
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="mr-2 h-4 w-4" /> New Folder
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="skeleton-shimmer h-11 w-11 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton-shimmer h-4 w-2/3 rounded" />
                  <div className="skeleton-shimmer h-3 w-1/2 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : folders.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-muted text-brand">
              <FolderIcon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No folders yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create your first folder to group related QR codes — by campaign, client, or location.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Plus className="mr-2 h-4 w-4" /> Create folder
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {folders.map((f) => (
            <Card key={f.id} className="group relative border-border transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-4">
                {editingId === f.id ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Color</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {FOLDER_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className={cn('h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-background', editColor === c ? 'ring-brand' : 'ring-transparent')}
                            style={{ background: c }}
                            aria-label={`Color ${c}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90">
                        <Check className="mr-1 h-3.5 w-3.5" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('qr-codes', { folder: f.id })}
                      className="flex w-full items-start gap-3 text-left"
                    >
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm"
                        style={{ background: f.color }}
                      >
                        <FolderIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{f.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {f.count} {f.count === 1 ? 'code' : 'codes'} · {formatDate(f.createdAt)}
                        </p>
                      </div>
                    </button>

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('qr-codes', { folder: f.id })}
                        className="text-brand"
                      >
                        Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(f)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(f)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new folder</DialogTitle>
            <DialogDescription>Folders help you group related QR codes together.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder name</Label>
              <Input
                id="folderName"
                placeholder="e.g. Marketing Campaign 2025"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createMut.mutate() }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={cn('h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all', newColor === c ? 'ring-brand scale-110' : 'ring-transparent')}
                    style={{ background: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!newName.trim() || createMut.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {createMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the folder. Any QR codes inside will become <strong>unfiled</strong> but are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default FoldersView
