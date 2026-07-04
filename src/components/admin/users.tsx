'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Ban, CheckCircle2, Crown, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

interface AdminUser {
  id: string; email: string; name: string | null; plan: string; role: string
  suspended: boolean; emailVerified: boolean; createdAt: string; qrCount: number
  trialEndsAt: string | null; avatarUrl: string | null
}

export function AdminUsers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), per_page: '20' })
      if (search) params.set('search', search)
      return api.get<{ data: AdminUser[]; pagination: { total: number; total_pages: number } }>(`/api/admin/users?${params}`)
    },
  })

  const mutate = useMutation({
    mutationFn: (vars: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/api/admin/users/${vars.id}`, vars.body),
    onSuccess: (_, vars) => {
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Update failed'),
  })

  const users = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search, suspend, and manage plans for all users.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>QRs</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-bold">
                            {u.name?.[0]?.toUpperCase() ?? u.email[0]?.toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{u.email}</p>
                            {u.name && <p className="truncate text-xs text-muted-foreground">{u.name}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={u.plan} onValueChange={(v) => mutate.mutate({ id: u.id, body: { plan: v } })}>
                          <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="business">Business</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'user' ? 'secondary' : 'outline'} className="text-[10px]">
                          {u.role === 'superadmin' && <Crown className="mr-1 h-3 w-3" />}
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{u.qrCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        {u.suspended ? (
                          <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px]">Suspended</Badge>
                        ) : u.emailVerified ? (
                          <Badge variant="secondary" className="text-[10px]">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] text-muted-foreground">Unverified</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn('h-7 text-xs', u.suspended ? 'text-foreground' : 'text-destructive')}
                          disabled={mutate.isPending}
                          onClick={() => mutate.mutate({ id: u.id, body: { suspended: !u.suspended } })}
                        >
                          {mutate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> :
                            u.suspended ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <Ban className="mr-1 h-3 w-3" />}
                          {u.suspended ? 'Unsuspend' : 'Suspend'}
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

      {/* Pagination */}
      {data && data.pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{data.pagination.total} users</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
