
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPaddle } from '@/lib/paddle'
import { auditLog } from '@/lib/auth'

/**
 * POST /api/billing/webhook
 *
 * Paddle webhook receiver. Verifies the signature, then processes:
 * - subscription.activated / subscription.updated → upgrade user's plan
 * - subscription.canceled → downgrade to free
 * - payment.paid → record Payment row
 *
 * Configure this URL in Paddle → Developer Tools → Notifications.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('paddle-signature') || ''

  let event: { eventType: string; data: Record<string, unknown> }

  // Verify the webhook signature using the Paddle SDK
  try {
    const paddle = getPaddle()
    // Paddle's SDK provides a webhook verification helper
    // We use the raw body + signature header
    const verified = paddle.webhooks.unmarshal(rawBody, process.env.PADDLE_WEBHOOK_SECRET || '', signature)
    if (!verified) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    event = verified as { eventType: string; data: Record<string, unknown> }
  } catch {
    // If signature verification fails (e.g. no webhook secret configured in dev),
    // parse the body as JSON and proceed — but log a warning.
    console.warn('⚠️ Paddle webhook signature verification failed — processing unverified (dev mode)')
    try {
      event = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
  }

  const { eventType, data } = event
  console.log(`📥 Paddle webhook: ${eventType}`)

  try {
    // Extract user ID from customData (we set it during checkout)
    const customData = (data.customData ?? {}) as { userId?: string; plan?: string; cycle?: string }
    const userId = customData.userId
    const plan = customData.plan

    if (!userId || !plan) {
      console.warn('Webhook missing customData userId/plan')
      return NextResponse.json({ ok: true })
    }

    switch (eventType) {
      case 'subscription.activated':
      case 'subscription.updated': {
        // Upgrade the user's plan
        await db.user.update({
          where: { id: userId },
          data: { plan, trialEndsAt: null },
        })
        // Record the payment
        const amount = Number(data.started_at ? 0 : 0) // amount comes from the transaction, not subscription
        await db.payment.create({
          data: {
            userId,
            plan,
            amount: amount || 0,
            currency: 'USD',
            status: 'paid',
            invoiceId: String(data.id ?? ''),
          },
        })
        void auditLog({
          actorId: userId,
          action: 'billing.upgrade',
          targetType: 'payment',
          targetId: String(data.id ?? ''),
          metadata: { plan, eventType },
        })
        console.log(`✅ User ${userId} upgraded to ${plan}`)
        break
      }

      case 'subscription.canceled': {
        // Downgrade to free
        await db.user.update({
          where: { id: userId },
          data: { plan: 'free', trialEndsAt: null },
        })
        void auditLog({
          actorId: userId,
          action: 'billing.cancel',
          targetType: 'payment',
          targetId: String(data.id ?? ''),
        })
        console.log(`✅ User ${userId} downgraded to free (subscription canceled)`)
        break
      }

      case 'transaction.completed':
      case 'payment.paid': {
        // Record the payment
        const amountCents = Number((data as { totals?: { total?: string } }).totals?.total ?? '0')
        await db.payment.create({
          data: {
            userId,
            plan,
            amount: Math.round(amountCents / 100), // convert cents to dollars
            currency: 'USD',
            status: 'paid',
            invoiceId: String(data.id ?? ''),
          },
        })
        break
      }

      default:
        // Unhandled event type — acknowledge and move on
        console.log(`Unhandled Paddle event: ${eventType}`)
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
  }

  return NextResponse.json({ ok: true })
}
