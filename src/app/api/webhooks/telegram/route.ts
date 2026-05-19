import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage, sendTelegramPhoto, answerCallbackQuery } from '@/lib/telegram'
import { Shippo } from 'shippo'

const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY! })

async function handleAction(chatId: string, action: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  })

  if (!order) {
    await sendTelegramMessage(chatId, 'Order not found.')
    return
  }

  if (order.status !== 'PENDING') {
    await sendTelegramMessage(chatId, `This order was already ${order.status.toLowerCase()}.`)
    return
  }

  const productNames = order.items.map(i => i.product.name).join(', ')

  if (action === 'YES') {
    await sendTelegramMessage(chatId, '⏳ Generating your shipping label...')

    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
      const address = session.customer_details?.address

      if (!address) {
        await sendTelegramMessage(chatId, 'Could not find shipping address. Check Stripe.')
        return
      }

      console.log('addressFrom:', {
        email: process.env.LAURA_ADDRESS_EMAIL,
        phone: process.env.LAURA_ADDRESS_PHONE,
      })
      const shipment = await shippo.shipments.create({
        addressFrom: {
          name: process.env.LAURA_ADDRESS_NAME!,
          street1: process.env.LAURA_ADDRESS_STREET!,
          city: process.env.LAURA_ADDRESS_CITY!,
          state: process.env.LAURA_ADDRESS_STATE!,
          zip: process.env.LAURA_ADDRESS_ZIP!,
          country: 'US',
        },
        addressTo: {
          name: session.customer_details?.name ?? 'Customer',
          street1: address.line1 ?? '',
          street2: address.line2 ?? '',
          city: address.city ?? '',
          state: address.state ?? '',
          zip: address.postal_code ?? '',
          country: 'US',
        },
        parcels: [{
          length: '12',
          width: '12',
          height: '8',
          distanceUnit: 'in' as const,
          weight: '3',
          massUnit: 'lb' as const,
        }],
        async: false,
      })

      const rates = (shipment.rates ?? []) as Array<{ provider: string; amount: string; objectId: string }>
      const uspsRate = rates
        .filter(r => r.provider === 'USPS')
        .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0]

      if (!uspsRate) {
        await sendTelegramMessage(chatId, 'No USPS rates available. Check Shippo.')
        return
      }

      const transaction = await shippo.transactions.create({
        rate: uspsRate.objectId,
        labelFileType: 'PNG' as const,
        async: false,
      })

      console.log('Shippo transaction:', JSON.stringify(transaction, null, 2))
      const tx = transaction as { qrCodeUrl?: string; labelUrl?: string }
      const qrUrl = tx.qrCodeUrl ?? tx.labelUrl ?? ''

      await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } })

      if (qrUrl) {
        await sendTelegramPhoto(chatId, qrUrl, `📦 Ship: ${productNames}\nShow this QR at USPS counter.`)
      } else {
        await sendTelegramMessage(chatId, 'Label generated. Check Shippo for the QR code.')
      }

    } catch (error) {
      console.error('Shippo error:', error)
      await sendTelegramMessage(chatId, 'Error generating label. Check logs.')
    }

  } else if (action === 'NO') {
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)

      if (session.payment_intent) {
        await stripe.paymentIntents.cancel(session.payment_intent as string)
      }

      for (const item of order.items) {
        await prisma.product.update({ where: { id: item.productId }, data: { inStock: true } })
      }

      await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } })
      await sendTelegramMessage(chatId, `✓ Cancelled. ${productNames} is back in the shop. Customer not charged.`)

    } catch (error) {
      console.error('Cancel error:', error)
      await sendTelegramMessage(chatId, 'Error cancelling. Check Stripe.')
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()

    // Handle button callback
    if (update.callback_query) {
      const callbackQuery = update.callback_query
      const chatId = String(callbackQuery.message.chat.id)
      const data = callbackQuery.data as string // e.g. "YES:order123" or "NO:order123"

      await answerCallbackQuery(callbackQuery.id)

      if (chatId !== process.env.LAURA_CHAT_ID) {
        return NextResponse.json({ ok: true })
      }

      const [action, orderId] = data.split(':')
      await handleAction(chatId, action, orderId)
      return NextResponse.json({ ok: true })
    }

    // Handle text message (fallback)
    const message = update.message
    if (message) {
      const chatId = String(message.chat.id)
      const text = (message.text ?? '').trim().toUpperCase()

      if (chatId !== process.env.LAURA_CHAT_ID) {
        return NextResponse.json({ ok: true })
      }

      if (text === 'YES' || text === 'Y') {
        const order = await prisma.order.findFirst({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
        })
        if (order) await handleAction(chatId, 'YES', order.id)
      } else if (text === 'NO' || text === 'N') {
        const order = await prisma.order.findFirst({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
        })
        if (order) await handleAction(chatId, 'NO', order.id)
      }
    }

  } catch (error) {
    console.error('Telegram webhook error:', error)
  }

  return NextResponse.json({ ok: true })
}