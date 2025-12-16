'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { purchaseTicketsSchema } from '@/lib/utils/validation'
import { checkTicketTypeAvailability, reserveTickets } from '@/lib/services/events/availability'
import { generateTickets } from '@/lib/services/tickets/generation'
import { createIdempotencyKey } from '@/lib/services/payments/idempotency'
import { getDefaultPaymentProvider } from '@/lib/services/payments/gateway'
import { PAYMENT_PROVIDERS, PAYMENT_STATUS } from '@/lib/utils/constants'
import { ValidationError, NotFoundError } from '@/lib/utils/errors'
import { rateLimit, getRateLimitKey } from '@/lib/security/rate-limit'
import { headers } from 'next/headers'
import { logAuditEvent } from '@/lib/security/audit'

export async function purchaseTickets(formData: FormData) {
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList,
  })

  // Rate limiting
  const rateLimitKey = getRateLimitKey(request, 'purchase')
  const rateLimitResult = await rateLimit(request, rateLimitKey, {
    requests: 10,
    window: 60,
  })

  if (!rateLimitResult.allowed) {
    throw new ValidationError('Too many requests. Please try again later.')
  }

  // Parse and validate input
  const data = {
    eventId: formData.get('eventId') as string,
    ticketTypeId: formData.get('ticketTypeId') as string,
    quantity: parseInt(formData.get('quantity') as string),
    discountCode: formData.get('discountCode') as string | undefined,
    guestInfo: formData.get('guestEmail') ? {
      email: formData.get('guestEmail') as string,
      name: formData.get('guestName') as string,
    } : undefined,
  }

  const validated = purchaseTicketsSchema.parse(data)

  // Check availability
  const availability = await checkTicketTypeAvailability(
    validated.ticketTypeId,
    validated.quantity
  )

  if (!availability.canPurchase) {
    throw new ValidationError(availability.reason || 'Tickets not available')
  }

  // Get user (optional - guest checkout allowed)
  const user = await getCurrentUser()

  // Get ticket type for pricing
  const supabase = await createServiceRoleClient()
  const { data: ticketType, error: ticketTypeError } = await supabase
    .from('ticket_types')
    .select('price, event_id')
    .eq('id', validated.ticketTypeId)
    .single()

  if (ticketTypeError || !ticketType) {
    throw new NotFoundError('Ticket type')
  }

  // Calculate total
  let total = parseFloat(ticketType.price as string) * validated.quantity

  // Apply discount if provided
  let discountId: string | undefined
  if (validated.discountCode) {
    const { data: discount } = await supabase
      .from('discounts')
      .select('*')
      .eq('code', validated.discountCode.toUpperCase())
      .eq('event_id', ticketType.event_id)
      .single()

    if (discount) {
      const now = new Date()
      const validFrom = new Date(discount.valid_from)
      const validUntil = new Date(discount.valid_until)

      if (now >= validFrom && now <= validUntil && discount.uses_count < (discount.max_uses || Infinity)) {
        if (discount.discount_type === 'percentage') {
          total = total * (1 - parseFloat(discount.discount_value as string) / 100)
        } else {
          total = Math.max(0, total - parseFloat(discount.discount_value as string))
        }
        discountId = discount.id
      }
    }
  }

  // Reserve tickets (optimistic locking)
  const reserved = await reserveTickets(validated.ticketTypeId, validated.quantity)
  if (!reserved) {
    throw new ValidationError('Tickets no longer available')
  }

  // Create payment record
  const idempotencyKey = await createIdempotencyKey()
  const paymentProvider = getDefaultPaymentProvider()

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      idempotency_key: idempotencyKey,
      user_id: user?.id || null,
      amount: total.toFixed(2),
      currency: 'USD',
      provider: paymentProvider.name as any,
      status: PAYMENT_STATUS.PENDING,
      payment_method: 'card',
    })
    .select()
    .single()

  if (paymentError || !payment) {
    throw new Error('Failed to create payment')
  }

  // Generate tickets
  const ticketIds = await generateTickets({
    ticketTypeId: validated.ticketTypeId,
    eventId: ticketType.event_id,
    purchaserId: user?.id,
    purchaserEmail: validated.guestInfo?.email || user?.email || '',
    purchaserName: validated.guestInfo?.name || user?.user_metadata?.full_name || 'Guest',
    paymentId: payment.id,
  }, validated.quantity)

  // Create payment items
  await supabase.from('payment_items').insert(
    ticketIds.map(ticketId => ({
      payment_id: payment.id,
      ticket_id: ticketId,
      item_type: 'ticket',
      amount: ticketType.price,
      quantity: 1,
    }))
  )

  // Record discount usage
  if (discountId) {
    await supabase.from('discount_usage').insert({
      discount_id: discountId,
      payment_id: payment.id,
      user_id: user?.id || null,
    })

    await supabase
      .from('discounts')
      .update({ uses_count: supabase.raw('uses_count + 1') })
      .eq('id', discountId)
  }

  // Create payment session
  const session = await paymentProvider.createPaymentSession({
    amount: total,
    currency: 'USD',
    description: `${validated.quantity} ticket(s)`,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/success?payment=${payment.id}`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/${validated.eventId}?cancelled=true`,
    metadata: {
      paymentId: payment.id,
      ticketIds,
    },
  })

  // Log audit event
  await logAuditEvent({
    userId: user?.id,
    action: 'ticket_purchase_initiated',
    resourceType: 'payment',
    resourceId: payment.id,
    metadata: {
      eventId: validated.eventId,
      ticketTypeId: validated.ticketTypeId,
      quantity: validated.quantity,
      amount: total,
    },
  })

  return {
    paymentId: payment.id,
    sessionId: session.sessionId,
    redirectUrl: session.redirectUrl,
    paymentUrl: session.paymentUrl,
  }
}

