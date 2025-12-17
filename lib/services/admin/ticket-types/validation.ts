import { createServiceRoleClient } from '@/lib/supabase/server'
import { ValidationError } from '@/lib/utils/errors'

/**
 * Validate ticket type availability
 */
export async function validateTicketTypeAvailability(
  ticketTypeId: string,
  quantity: number
): Promise<{ available: boolean; availableQuantity: number }> {
  const supabase = await createServiceRoleClient()

  const { data: ticketType, error } = await supabase
    .from('ticket_types')
    .select('quantity_available, quantity_sold')
    .eq('id', ticketTypeId)
    .single()

  if (error || !ticketType) {
    throw new ValidationError('Tipo de ticket no encontrado')
  }

  const available = ticketType.quantity_available - (ticketType.quantity_sold || 0)
  const availableQuantity = Math.max(0, available)

  return {
    available: availableQuantity >= quantity,
    availableQuantity,
  }
}

/**
 * Check if ticket type can be modified
 */
export async function canModifyTicketType(ticketTypeId: string): Promise<{
  canModify: boolean
  reason?: string
}> {
  const supabase = await createServiceRoleClient()

  const { data: ticketType, error } = await supabase
    .from('ticket_types')
    .select('quantity_sold')
    .eq('id', ticketTypeId)
    .single()

  if (error || !ticketType) {
    return {
      canModify: false,
      reason: 'Tipo de ticket no encontrado',
    }
  }

  // Can always modify if no tickets sold
  if (!ticketType.quantity_sold || ticketType.quantity_sold === 0) {
    return { canModify: true }
  }

  // Can modify but with restrictions (can't reduce quantity below sold)
  return {
    canModify: true,
    reason: 'Tiene tickets vendidos, no se puede reducir cantidad disponible por debajo de tickets vendidos',
  }
}

/**
 * Validate ticket type sale dates against event dates
 */
export async function validateTicketTypeDates(
  eventId: string,
  saleStart?: string | null,
  saleEnd?: string | null
): Promise<{ valid: boolean; error?: string }> {
  const supabase = await createServiceRoleClient()

  // Get event dates
  const { data: event, error } = await supabase
    .from('events')
    .select('start_date, end_date')
    .eq('id', eventId)
    .single()

  if (error || !event) {
    return {
      valid: false,
      error: 'Evento no encontrado',
    }
  }

  const eventStart = new Date(event.start_date)
  const eventEnd = new Date(event.end_date)

  // Validate sale start
  if (saleStart) {
    const saleStartDate = new Date(saleStart)
    if (isNaN(saleStartDate.getTime())) {
      return {
        valid: false,
        error: 'Fecha de inicio de venta inválida',
      }
    }
    if (saleStartDate > eventEnd) {
      return {
        valid: false,
        error: 'La fecha de inicio de venta no puede ser después del fin del evento',
      }
    }
  }

  // Validate sale end
  if (saleEnd) {
    const saleEndDate = new Date(saleEnd)
    if (isNaN(saleEndDate.getTime())) {
      return {
        valid: false,
        error: 'Fecha de fin de venta inválida',
      }
    }
    if (saleEndDate > eventEnd) {
      return {
        valid: false,
        error: 'La fecha de fin de venta no puede ser después del fin del evento',
      }
    }
  }

  // Validate sale start < sale end
  if (saleStart && saleEnd) {
    const saleStartDate = new Date(saleStart)
    const saleEndDate = new Date(saleEnd)
    if (saleStartDate >= saleEndDate) {
      return {
        valid: false,
        error: 'La fecha de inicio de venta debe ser antes de la fecha de fin',
      }
    }
  }

  return { valid: true }
}

/**
 * Check if ticket type can be deleted
 */
export async function canDeleteTicketType(ticketTypeId: string): Promise<{
  canDelete: boolean
  reasons: string[]
}> {
  const supabase = await createServiceRoleClient()
  const reasons: string[] = []

  // Get ticket type
  const { data: ticketType, error } = await supabase
    .from('ticket_types')
    .select('quantity_sold')
    .eq('id', ticketTypeId)
    .single()

  if (error || !ticketType) {
    reasons.push('Tipo de ticket no encontrado')
    return { canDelete: false, reasons }
  }

  // Check for sold tickets
  if (ticketType.quantity_sold && ticketType.quantity_sold > 0) {
    reasons.push(`Tiene ${ticketType.quantity_sold} tickets vendidos`)
  }

  // Check for pending payment tickets
  const { data: pendingTickets } = await supabase
    .from('tickets')
    .select('id')
    .eq('ticket_type_id', ticketTypeId)
    .eq('status', 'pending_payment')
    .limit(1)

  if (pendingTickets && pendingTickets.length > 0) {
    reasons.push('Tiene tickets con pago pendiente')
  }

  return {
    canDelete: reasons.length === 0,
    reasons,
  }
}

