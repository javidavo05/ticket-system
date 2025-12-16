import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, processPaymentWebhook } from '@/lib/services/payments/webhook'
import { PAYMENT_PROVIDERS } from '@/lib/utils/constants'

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider

    if (!Object.values(PAYMENT_PROVIDERS).includes(provider as any)) {
      return NextResponse.json(
        { error: 'Invalid payment provider' },
        { status: 400 }
      )
    }

    // Get signature from headers (provider-specific)
    const signature = request.headers.get('x-signature') || 
                     request.headers.get('x-webhook-signature') ||
                     request.headers.get('authorization')?.replace('Bearer ', '') ||
                     ''

    const body = await request.text()

    // Verify webhook signature
    const isValid = await verifyWebhook(provider, signature, body)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Parse payload
    const payload = JSON.parse(body)

    // Process webhook
    await processPaymentWebhook(provider, payload, request)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

