import { Paddle, Environment, type Product, type Price } from '@paddle/paddle-node-sdk'

/**
 * Paddle SDK singleton. Uses the live API key from env.
 * In sandbox mode you'd use Environment.sandbox — but we have a live key.
 */
let paddle: Paddle | null = null

export function getPaddle(): Paddle {
  if (!paddle) {
    const key = process.env.PADDLE_API_KEY
    if (!key) throw new Error('PADDLE_API_KEY is not set')
    paddle = new Paddle(key, Environment.production)
  }
  return paddle
}

// Plan → Paddle price IDs (populated at startup by ensurePaddleProducts).
// Stored in-memory; in production you'd persist these to your DB or env.
let PLAN_PRICE_MAP: Record<string, { monthly: string; yearly: string }> = {
  starter: { monthly: '', yearly: '' },
  pro: { monthly: '', yearly: '' },
  business: { monthly: '', yearly: '' },
}

/**
 * Ensure Paddle products + prices exist for all paid plans.
 * Creates them if missing, stores the price IDs for checkout.
 * Safe to call on every server start — idempotent.
 */
export async function ensurePaddleProducts(): Promise<void> {
  const p = getPaddle()
  const plans = [
    { id: 'starter', name: 'Starter', monthly: 500, yearly: 5000 },   // $5/mo, $50/yr (cents)
    { id: 'pro', name: 'Pro', monthly: 1200, yearly: 12000 },         // $12/mo, $120/yr
    { id: 'business', name: 'Business', monthly: 2900, yearly: 29000 }, // $29/mo, $290/yr
  ]

  for (const plan of plans) {
    try {
      // List existing products to find ours (by name)
      const existing = await p.products.list({ perPage: 100 }).next()
      let product: Product | undefined = existing.value

      // Search through all products for a matching name
      const allProducts: Product[] = []
      const iter = p.products.list({ perPage: 100 })
      for await (const prod of iter) {
        allProducts.push(prod)
      }
      product = allProducts.find((pr) => pr.name === plan.name)

      if (!product) {
        // Create the product
        product = await p.products.create({
          name: plan.name,
          description: `CreateAnQRCode ${plan.name} subscription`,
          taxCategory: 'standard',
        })
        console.log(`📦 Paddle product created: ${plan.name} (${product.id})`)
      }

      // Check for existing prices
      const allPrices: Price[] = []
      const priceIter = p.prices.list({ perPage: 100, productId: [product.id] })
      for await (const pr of priceIter) {
        allPrices.push(pr)
      }

      // Monthly price ($X.00/month)
      const monthlyPrice = allPrices.find((pr) =>
        pr.name === `${plan.name} Monthly` && pr.billingCycle?.interval === 'month'
      )
      if (!monthlyPrice) {
        const newMonthly = await p.prices.create({
          productId: product.id,
          name: `${plan.name} Monthly`,
          description: `${plan.name} plan, billed monthly`,
          billingCycle: { interval: 'month', frequency: 1 },
          money: { amount: String(plan.monthly), currencyCode: 'USD' },
          quantity: { minimum: 1, maximum: 1 },
          taxMode: 'exclusive',
        })
        PLAN_PRICE_MAP[plan.id].monthly = newMonthly.id
        console.log(`💲 Paddle monthly price created: ${plan.name} ($${plan.monthly / 100}/mo)`)
      } else {
        PLAN_PRICE_MAP[plan.id].monthly = monthlyPrice.id
      }

      // Yearly price ($X*10/year)
      const yearlyPrice = allPrices.find((pr) =>
        pr.name === `${plan.name} Yearly` && pr.billingCycle?.interval === 'year'
      )
      if (!yearlyPrice) {
        const newYearly = await p.prices.create({
          productId: product.id,
          name: `${plan.name} Yearly`,
          description: `${plan.name} plan, billed annually (2 months free)`,
          billingCycle: { interval: 'year', frequency: 1 },
          money: { amount: String(plan.yearly), currencyCode: 'USD' },
          quantity: { minimum: 1, maximum: 1 },
          taxMode: 'exclusive',
        })
        PLAN_PRICE_MAP[plan.id].yearly = newYearly.id
        console.log(`💲 Paddle yearly price created: ${plan.name} ($${plan.yearly / 100}/yr)`)
      } else {
        PLAN_PRICE_MAP[plan.id].yearly = yearlyPrice.id
      }
    } catch (err) {
      console.error(`❌ Paddle setup failed for ${plan.name}:`, err)
    }
  }
}

/** Get the Paddle price ID for a plan + billing cycle. */
export function getPriceId(plan: string, cycle: 'monthly' | 'yearly'): string | null {
  return PLAN_PRICE_MAP[plan]?.[cycle] ?? null
}

/** Create a Paddle checkout transaction and return the checkout URL. */
export async function createCheckout(opts: {
  userId: string
  email: string
  plan: string
  cycle: 'monthly' | 'yearly'
}): Promise<{ checkoutUrl: string | null; transactionId: string }> {
  const p = getPaddle()
  const priceId = getPriceId(opts.plan, opts.cycle)
  if (!priceId) throw new Error(`No Paddle price found for plan ${opts.plan} ${opts.cycle}`)

  const transaction = await p.transactions.create({
    items: [{ priceId, quantity: 1 }],
    customer: { email: opts.email },
    customData: { userId: opts.userId, plan: opts.plan, cycle: opts.cycle },
    checkout: { url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://createanqrcode.com'}/billing` },
  })

  return {
    checkoutUrl: transaction.checkout?.url ?? null,
    transactionId: transaction.id,
  }
}
