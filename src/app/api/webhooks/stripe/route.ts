import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    try {
      const items = JSON.parse(session.metadata?.items ?? '[]')

      await prisma.order.create({
        data: {
          stripeSessionId: session.id,
          customerEmail: session.customer_details?.email ?? '',
          status: 'PAID',
          total: (session.amount_total ?? 0) / 100,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              pieceCount: item.pieceCount,
              price: item.price,
            })),
          },
        },
      })
    } catch (error) {
      console.error('Order creation error:', error)
    }
  }

  return NextResponse.json({ received: true })
}