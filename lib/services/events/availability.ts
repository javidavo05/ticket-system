import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'

export interface AvailabilityCheck {
  available: boolean
  quantityAvailable: number
  quantitySold: number
  canPurchase: boolean
  reason?: string
}

export async function checkTicketTypeAvailability(
  ticketTypeId: string,
  quantity: number
): Promise<AvailabilityCheck> {
  const supabase = await createServiceRoleClient()

  const { data: ticketType, error } = await supabase
    .from('ticket_types')
    .select('quantity_available, quantity_sold, sale_start, sale_end, max_per_purchase')
    .eq('id', ticketTypeId)
    .single()

  if (error || !ticketType) {
    throw new NotFoundError('Ticket type')
  }

  const now = new Date()
  const saleStart = ticketType.sale_start ? new Date(ticketType.sale_start) : null
  const saleEnd = ticketType.sale_end ? new Date(ticketType.sale_end) : null

  // Check sale period
  if (saleStart && now < saleStart) {
    return {
      available: false,
      quantityAvailable: ticketType.quantity_available,
      quantitySold: ticketType.quantity_sold,
      canPurchase: false,
      reason: 'Sale has not started yet',
    }
  }

  if (saleEnd && now > saleEnd) {
    return {
      available: false,
      quantityAvailable: ticketType.quantity_available,
      quantitySold: ticketType.quantity_sold,
      canPurchase: false,
      reason: 'Sale has ended',
    }
  }

  // Check quantity
  const remaining = ticketType.quantity_available - ticketType.quantity_sold
  if (remaining < quantity) {
    return {
      available: false,
      quantityAvailable: ticketType.quantity_available,
      quantitySold: ticketType.quantity_sold,
      canPurchase: false,
      reason: `Only ${remaining} tickets available`,
    }
  }

  // Check max per purchase
  if (ticketType.max_per_purchase && quantity > ticketType.max_per_purchase) {
    return {
      available: false,
      quantityAvailable: ticketType.quantity_available,
      quantitySold: ticketType.quantity_sold,
      canPurchase: false,
      reason: `Maximum ${ticketType.max_per_purchase} tickets per purchase`,
    }
  }

  return {
    available: true,
    quantityAvailable: ticketType.quantity_available,
    quantitySold: ticketType.quantity_sold,
    canPurchase: true,
  }
}

export async function reserveTickets(
  ticketTypeId: string,
  quantity: number
): Promise<boolean> {
  const supabase = await createServiceRoleClient()

  // Use database transaction to atomically check and update
  const { data: ticketType } = await supabase
    .from('ticket_types')
    .select('quantity_available, quantity_sold')
    .eq('id', ticketTypeId)
    .single()

  if (!ticketType) {
    return false
  }

  const remaining = ticketType.quantity_available - ticketType.quantity_sold
  if (remaining < quantity) {
    return false
  }

  // Update quantity sold
  const { error } = await supabase
    .from('ticket_types')
    .update({
      quantity_sold: ticketType.quantity_sold + quantity,
    })
    .eq('id', ticketTypeId)
    .eq('quantity_sold', ticketType.quantity_sold) // Optimistic locking

  return !error
}

