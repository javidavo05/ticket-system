'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { purchaseTicketsSchema } from '@/lib/utils/validation'
import { checkTicketTypeAvailability, reserveTickets } from '@/lib/services/events/availability'
import { generateTickets } from '@/lib/services/tickets/generation'
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
  const rateLimitKey = getRateLimitKey(request as any, 'purchase')
  const rateLimitResult = await rateLimit(request as any, rateLimitKey, {
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
  const { data: ticketTypeData, error: ticketTypeError } = await supabase
    .from('ticket_types')
    .select('price, event_id, organization_id')
    .eq('id', validated.ticketTypeId)
    .single()

  if (ticketTypeError || !ticketTypeData) {
    throw new NotFoundError('Ticket type')
  }

  const ticketType = ticketTypeData as {
    price: string | number
    event_id: string
    organization_id: string | null
  }

  // Calculate total
  let total = parseFloat(ticketType.price as string) * validated.quantity

  // Apply discount if provided
  let discountId: string | undefined
  if (validated.discountCode) {
    const { data: discountData } = await supabase
      .from('discounts')
      .select('*')
      .eq('code', validated.discountCode.toUpperCase())
      .eq('event_id', ticketType.event_id)
      .single()

    const discount = discountData as {
      valid_from: string
      valid_until: string
      uses_count: number
      max_uses: number | null
      [key: string]: any
    } | null

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

  // Create payment using new payment creation service
  const { createPayment } = await import('@/lib/services/payments/creation')
  
  const paymentResult = await createPayment({
    userId: user?.id,
    organizationId: ticketType.organization_id || undefined,
    amount: total,
    currency: 'USD',
    provider: process.env.DEFAULT_PAYMENT_PROVIDER || 'yappy',
    paymentMethod: 'card',
    allowsPartial: false,
    description: `Purchase of ${validated.quantity} ticket(s)`,
    metadata: {
      ticketTypeId: validated.ticketTypeId,
      eventId: validated.eventId,
      quantity: validated.quantity,
      discountCode: validated.discountCode,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/success?payment=pending`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/${validated.eventId}?cancelled=true`,
    },
    items: [{
      ticketTypeId: validated.ticketTypeId,
      itemType: 'ticket',
      amount: total,
      quantity: validated.quantity,
    }],
  })

  // Get payment record
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentResult.paymentId)
    .single()

  if (paymentError || !paymentData) {
    throw new Error('Failed to retrieve created payment')
  }

  const payment = paymentData as any

  // Generate tickets
  const ticketIds = await generateTickets({
    ticketTypeId: validated.ticketTypeId,
    eventId: ticketType.event_id,
    purchaserId: user?.id,
    purchaserEmail: validated.guestInfo?.email || user?.email || '',
    purchaserName: validated.guestInfo?.name || user?.user_metadata?.full_name || 'Guest',
    paymentId: payment.id,
  }, validated.quantity)

  // Update payment items (they were created by createPayment, but we need to link tickets)
  // First, get existing payment items
  const { data: existingItemsData } = await supabase
    .from('payment_items')
    .select('id')
    .eq('payment_id', payment.id)
    .limit(validated.quantity)

  const existingItems = (existingItemsData || []) as Array<{
    id: string
  }>

  if (existingItems.length > 0) {
    // Update items with ticket IDs
    for (let i = 0; i < Math.min(existingItems.length, ticketIds.length); i++) {
      await ((supabase as any)
        .from('payment_items')
        .update({
          ticket_id: ticketIds[i] || null,
        })
        .eq('id', existingItems[i].id))
    }
  } else {
    // Fallback: create payment items if they don't exist
    await ((supabase as any).from('payment_items').insert(
      ticketIds.map(ticketId => ({
        payment_id: payment.id,
        ticket_id: ticketId,
        item_type: 'ticket',
        amount: ticketType.price,
        quantity: 1,
      }))
    ))
  }

  // Record discount usage
  if (discountId) {
    await ((supabase as any).from('discount_usage').insert({
      discount_id: discountId,
      payment_id: payment.id,
      user_id: user?.id || null,
    }))

    await ((supabase as any)
      .from('discounts')
      .update({ uses_count: (supabase as any).raw('uses_count + 1') })
      .eq('id', discountId))
  }

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
    sessionId: paymentResult.sessionId,
    redirectUrl: paymentResult.redirectUrl,
    paymentUrl: paymentResult.paymentUrl,
    qrCode: paymentResult.qrCode,
  }
}

