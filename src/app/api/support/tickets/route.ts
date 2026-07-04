
import { NextRequest, NextResponse } from 'next/server'
import { getSession, rateLimit, rateLimitHeaders } from '@/lib/auth'
import { z } from 'zod'

// Tickets are stored in-memory (this single-instance env has no extra table).
// In production these would persist to a SupportTicket table + email the team.
interface StoredTicket { id: string; userId: string; email: string; subject: string; category: string; description: string; attachmentName: string | null; status: 'open'; createdAt: string }
const TICKETS: StoredTicket[] = []

const schema = z.object({
  subject: z.string().min(3).max(120),
  category: z.string().min(1),
  description: z.string().min(10).max(5000),
  attachmentName: z.string().max(200).optional(),
})

// Anti-spam: 5 tickets per user per hour.
const TICKET_LIMIT = 5
const TICKET_WINDOW = 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const session = await getSession()
  // Tickets require an account so we can reply + rate-limit per user.
  if (!session) return NextResponse.json({ error: 'Please sign in to submit a ticket.' }, { status: 401 })
  const rl = rateLimit(`ticket:${session.userId}`, TICKET_LIMIT, TICKET_WINDOW)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many tickets. Please wait before submitting again.' }, { status: 429, headers: rateLimitHeaders(rl) })
  }
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please provide a subject (3+ chars) and description (10+ chars).' }, { status: 400, headers: rateLimitHeaders(rl) })
  }
  const { subject, category, description, attachmentName } = parsed.data
  const id = `TICKET-${Date.now().toString(36).toUpperCase()}`
  const ticket: StoredTicket = {
    id, userId: session.userId, email: session.user.email,
    subject, category, description, attachmentName: attachmentName ?? null,
    status: 'open', createdAt: new Date().toISOString(),
  }
  TICKETS.push(ticket)
  // NOTE: no email transport in this env. In production, a transactional email
  // would notify support@createanqrcode.com with the ticket details.
  return NextResponse.json({ id, status: 'open', message: `Ticket ${id} received. We'll reply to ${session.user.email} within your plan's SLA.` }, { status: 201, headers: rateLimitHeaders(rl) })
}
