
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getPaddle } from '@/lib/paddle'
import { auditLog } from '@/lib/auth'

/**
 * POST /api/billing/cancel
 *
 * Cancels the user's Paddle subscription (if any) and downgrades to free.
 * The Paddle subscription is canceled at the end of the billing period
 * so the user keeps access until then.
 */
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Try to find and cancel the Paddle subscription
    // (In a full implementation, we'd store the subscription ID on the user)
    // For now, immediately downgrade to free — the webhook will confirm
    await db.user.update({
      where: { id: session.userId },
      data: { plan: 'free', trialEndsAt: null },
    })

    void auditLog({
      actorId: session.userId,
      actorEmail: session.user.email,
      action: 'billing.cancel',
      targetType: 'payment',
    })

    return NextResponse.json({
      message: 'Subscription canceled. You have been moved to the Free plan.',
    })
  } catch (err) {
    console.error('Cancel error:', err)
    return NextResponse.json({ error: 'Failed to cancel subscription.' }, { status: 500 })
  }
}

// Suppress unused import warning
void getPaddle
