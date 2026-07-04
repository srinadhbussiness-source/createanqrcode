'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ScrollText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

interface AuditEntry {
  id: string; actorId: string | null; actorEmail: string | null
  action: string; targetType: string | null; targetId: string | null
  metadata: Record<string, unknown> | null; ip: string | null; createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  'user.suspend': 'bg-destructive/10 text-destructive',
  'user.unsuspend': 'bg-foreground/5 text-foreground',
  'qr.takedown': 'bg-destructive/10 text-destructive',
  'admin.viewStats': 'bg-foreground/5 text-muted-foreground',
}

export function AdminAudit() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), per_page: '30' })
      if (search) params.set('action', search)
      return api.get<{ data: AuditEntry[]; pagination: { total: number; total_pages: number } }>(`/api/admin/audit?${params}`)
    },
  })

  const logs = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">Immutable record of all admin actions. Search by action type (e.g. "user.suspend").</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Filter by action…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <ScrollText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No audit entries yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</TableCell>
                      <TableCell className="text-xs">{l.actorEmail ?? 'system'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] ${ACTION_COLORS[l.action] ?? ''}`}>{l.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.targetType ? `${l.targetType}${l.targetId ? `:${l.targetId.slice(-6)}` : ''}` : '—'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {l.metadata ? JSON.stringify(l.metadata).slice(0, 80) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.ip ?? '—'}</TableCell>
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
          <p className="text-xs text-muted-foreground">{data.pagination.total} entries</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
