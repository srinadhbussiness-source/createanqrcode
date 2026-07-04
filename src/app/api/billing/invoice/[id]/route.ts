
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { PLAN_LIMITS } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/billing/invoice/[id] — returns a printable HTML invoice for a
 * payment. The HTML is designed to be opened/saved-as-PDF via the browser's
 * print dialog (window.print()). Ownership-checked.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const payment = await db.payment.findUnique({ where: { id } })
  if (!payment || payment.userId !== session.userId) {
    return new NextResponse('<h1>Invoice not found</h1>', { status: 404, headers: { 'Content-Type': 'text/html' } })
  }
  const user = await db.user.findUnique({ where: { id: session.userId } })
  const planInfo = PLAN_LIMITS[payment.plan as keyof typeof PLAN_LIMITS]
  const amount = payment.amount
  const currency = payment.currency === 'INR' ? '₹' : '$'
  const tax = Math.round(amount * 0.18) // 18% tax (GST for INR, sales tax illustrative for USD)
  const subtotal = amount - tax
  const invoiceId = payment.invoiceId ?? `INV-${payment.id.slice(-8).toUpperCase()}`
  const date = new Date(payment.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invoiceId}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a0a0a;background:#fff;padding:40px;max-width:720px;margin:0 auto}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0a0a0a;padding-bottom:20px;margin-bottom:30px}
    .brand{font-size:22px;font-weight:700}
    .brand span{display:block;font-size:11px;font-weight:400;color:#71717a;margin-top:2px}
    .inv-meta{text-align:right;font-size:13px}
    .inv-meta h1{font-size:28px;font-weight:800;letter-spacing:-0.02em}
    .inv-meta p{color:#71717a;margin-top:2px}
    .bill-to{margin-bottom:30px}
    .bill-to h2{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#71717a;margin-bottom:6px}
    .bill-to p{font-size:14px;line-height:1.6}
    table{width:100%;border-collapse:collapse;margin-bottom:30px}
    th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;padding:10px 12px;border-bottom:1px solid #e4e4e7}
    td{padding:14px 12px;border-bottom:1px solid #f4f4f5;font-size:14px}
    .total-row{font-weight:700;font-size:16px;background:#fafafa}
    .total-row td{border-bottom:none;border-top:2px solid #0a0a0a}
    .foot{margin-top:40px;padding-top:20px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;line-height:1.6}
    .foot a{color:#0a0a0a}
    @media print{body{padding:20px}.no-print{display:none}}
  </style></head><body>
    <div class="head">
      <div class="brand">CreateAnQRCode<span>Free QR codes. Forever.</span></div>
      <div class="inv-meta">
        <h1>INVOICE</h1>
        <p>#${invoiceId}</p>
        <p>Date: ${date}</p>
        <p>Status: ${payment.status.toUpperCase()}</p>
      </div>
    </div>
    <div class="bill-to">
      <h2>Billed to</h2>
      <p>${user?.name ?? '—'}<br>${user?.email ?? '—'}<br>Plan: ${payment.plan} (billed ${payment.currency})</p>
    </div>
    <table>
      <thead><tr><th>Description</th><th>Plan</th><th>Qty</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr><td>CreateAnQRCode ${payment.plan} subscription</td><td>${payment.plan}</td><td>1</td><td style="text-align:right">${currency}${subtotal.toLocaleString('en-IN')}</td></tr>
        <tr><td>Tax (GST 18%)</td><td>—</td><td>—</td><td style="text-align:right">${currency}${tax.toLocaleString('en-IN')}</td></tr>
        <tr class="total-row"><td colspan="3">Total Paid</td><td style="text-align:right">${currency}${amount.toLocaleString('en-IN')}</td></tr>
      </tbody>
    </table>
    <div class="foot">
      <p>Thank you for your business! This invoice covers your ${payment.plan} plan subscription.</p>
      <p>Need help? Email <a href="mailto:support@createanqrcode.com">support@createanqrcode.com</a> · ${planInfo ? `${payment.plan} plan · unlimited scans` : ''}</p>
      <p class="no-print" style="margin-top:16px"><button onclick="window.print()" style="padding:8px 16px;background:#0a0a0a;color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:13px">Print / Save as PDF</button></p>
    </div>
  </body></html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
}
