
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createCheckout, ensurePaddleProducts } from '@/lib/paddle'
import type { Plan } from '@/lib/types'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan, currency, cycle } = (await req.json()) as {
    plan: Plan
    currency?: 'INR' | 'USD'
    cycle?: 'monthly' | 'yearly'
  }

  if (!plan || plan === 'free') {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })
  }

  const billingCycle = cycle ?? 'yearly'

  try {
    // Ensure Paddle products exist (idempotent — creates if missing)
    await ensurePaddleProducts()

    // Create a Paddle checkout transaction
    const { checkoutUrl, transactionId } = await createCheckout({
      userId: session.userId,
      email: session.user.email,
      plan,
      cycle: billingCycle,
    })

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 500 })
    }

    // Store the pending transaction ID on the user for webhook correlation
    await db.user.update({
      where: { id: session.userId },
      data: { /* webhook will set the plan on payment success */ },
    })

    return NextResponse.json({
      checkoutUrl,
      transactionId,
      message: 'Redirecting to secure checkout…',
    })
  } catch (err) {
    console.error('Paddle checkout error:', err)
    return NextResponse.json(
      { error: 'Payment setup failed. Please try again or contact support.' },
      { status: 500 }
    )
  }
}
