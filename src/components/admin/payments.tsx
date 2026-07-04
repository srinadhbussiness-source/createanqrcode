'use client'

import { useQuery } from '@tanstack/react-query'
import { IndianRupee, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/format'

interface Payment {
  id: string; plan: string; amount: number; currency: string; status: string
  invoiceId: string | null; createdAt: string
  user: { email: string; name: string | null }
}

export function AdminPayments() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payments'],
    queryFn: () => api.get<{ data: Payment[]; totalRevenueUSD: number; pagination: { total: number } }>('/api/admin/payments?per_page=50'),
  })

  const payments = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">All payments across the platform.</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground/5"><IndianRupee className="h-5 w-5" /></span>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold">${(data?.totalRevenueUSD ?? 0).toLocaleString('en-US')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground/5"><Receipt className="h-5 w-5" /></span>
            <div>
              <p className="text-xs text-muted-foreground">Total Payments</p>
              <p className="text-xl font-bold">{data?.pagination.total ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground/5"><Receipt className="h-5 w-5" /></span>
            <div>
              <p className="text-xs text-muted-foreground">Avg. Payment</p>
              <p className="text-xl font-bold">${payments.length ? Math.round((data?.totalRevenueUSD ?? 0) / payments.length).toLocaleString('en-US') : 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : payments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No payments yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                      <TableCell className="text-sm">{p.user.email}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{p.plan}</Badge></TableCell>
                      <TableCell className="font-medium">{formatCurrency(p.amount, p.currency === 'USD' ? 'USD' : 'INR')}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{p.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(`/api/billing/invoice/${p.id}`, '_blank')}>
                          View
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
    </div>
  )
}
