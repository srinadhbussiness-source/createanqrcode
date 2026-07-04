'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Trash2, Loader2, Lock, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/format'

interface AdminQr {
  id: string; title: string; qrType: string; isDynamic: boolean; status: string
  destinationUrl: string | null; shortCode: string | null; scanCount: number
  trashed: boolean; passwordProtected: boolean; createdAt: string
  user: { email: string; name: string | null }
}

export function AdminQrCodes() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'qr-codes', search, status, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), per_page: '20' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      return api.get<{ data: AdminQr[]; pagination: { total: number; total_pages: number } }>(`/api/admin/qr-codes?${params}`)
    },
  })

  const takedown = useMutation({
    mutationFn: (id: string) => api.del(`/api/admin/qr-codes/${id}`),
    onSuccess: () => {
      toast.success('QR code taken down')
      qc.invalidateQueries({ queryKey: ['admin', 'qr-codes'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Takedown failed'),
  })

  const codes = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QR Code Moderation</h1>
        <p className="mt-1 text-sm text-muted-foreground">All QR codes on the platform. Take down abusive or policy-violating codes.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by title, URL, or owner email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {['', 'trashed', 'dynamic', 'password'].map((s) => (
            <Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => { setStatus(s); setPage(1) }}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : codes.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No QR codes found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scans</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.title}</p>
                          {c.destinationUrl && (
                            <a href={c.destinationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-brand">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">{c.destinationUrl}</span>
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{c.user.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">{c.qrType}</Badge>
                          {c.isDynamic && <Badge variant="outline" className="text-[10px]">Dynamic</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{c.scanCount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {c.trashed && <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px]">Trashed</Badge>}
                          {c.passwordProtected && <Badge variant="outline" className="text-[10px]"><Lock className="mr-0.5 h-2.5 w-2.5" />PW</Badge>}
                          {c.status === 'paused' && <Badge variant="secondary" className="text-[10px]">Paused</Badge>}
                          {c.status === 'archived' && <Badge variant="secondary" className="text-[10px]">Archived</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive"
                          disabled={takedown.isPending || c.trashed}
                          onClick={() => takedown.mutate(c.id)}
                        >
                          {takedown.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                          {c.trashed ? 'Taken down' : 'Take down'}
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

      {data && data.pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{data.pagination.total} QR codes</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
