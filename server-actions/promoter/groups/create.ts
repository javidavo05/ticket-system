'use server'

import { requirePromoter } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ValidationError, NotFoundError } from '@/lib/utils/errors'
import {
  validateTicketAvailability,
  validatePromoterOrganization,
} from '@/lib/services/promoter/groups/validation'
import { generateTicket } from '@/lib/services/tickets/generation'
import { TICKET_STATUS } from '@/lib/utils/constants'
import { logAuditEvent } from '@/lib/security/audit'
import { z } from 'zod'

const createTicketGroupSchema = z.object({
  eventId: z.string().uuid(),
  ticketTypeId: z.string().uuid(),
  quantity: z.number().int().positive(),
  groupName: z.string().optional(),
  allowsPartial: z.boolean().default(true),
  minPartialAmount: z.number().positive().optional(),
})

export async function createTicketGroupAction(formData: FormData) {
  const user = await requirePromoter()

  // Parse and validate input
  const data = {
    eventId: formData.get('eventId') as string,
    ticketTypeId: formData.get('ticketTypeId') as string,
    quantity: parseInt(formData.get('quantity') as string),
    groupName: formData.get('groupName') as string | undefined,
    allowsPartial: formData.get('allowsPartial') === 'true',
    minPartialAmount: formData.get('minPartialAmount')
      ? parseFloat(formData.get('minPartialAmount') as string)
      : undefined,
  }

  const validated = createTicketGroupSchema.parse(data)

  // Validate ticket availability
  const availabilityValidation = await validateTicketAvailability(
    validated.eventId,
    validated.ticketTypeId,
    validated.quantity
  )

  if (!availabilityValidation.isValid) {
    throw new ValidationError(availabilityValidation.reason || 'Tickets not available')
  }

  // Validate promoter organization
  const orgValidation = await validatePromoterOrganization(user.id, validated.eventId)
  if (!orgValidation.isValid) {
    throw new ValidationError(orgValidation.reason || 'Organization mismatch')
  }

  const supabase = await createServiceRoleClient()

  // Get ticket type for pricing
  const { data: ticketType, error: ticketTypeError } = await supabase
    .from('ticket_types')
    .select('price, event_id, organization_id')
    .eq('id', validated.ticketTypeId)
    .single()

  if (ticketTypeError || !ticketType) {
    throw new NotFoundError('Ticket type')
  }

  const ticketTypeData = ticketType as {
    price: string | number
    [key: string]: any
  }

  // Calculate total amount
  const price = parseFloat(ticketTypeData.price as string)
  const totalAmount = price * validated.quantity

  // Get event organization
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('organization_id')
    .eq('id', validated.eventId)
    .single()

  if (eventError || !eventData) {
    throw new NotFoundError('Event')
  }

  const event = eventData as {
    organization_id: string | null
  }

  // Create ticket group
  const { data: group, error: groupError } = await ((supabase as any)
    .from('ticket_groups')
    .insert({
      event_id: validated.eventId,
      ticket_type_id: validated.ticketTypeId,
      promoter_id: user.id,
      organization_id: event.organization_id || null,
      group_name: validated.groupName || null,
      total_tickets: validated.quantity,
      total_amount: totalAmount.toFixed(2),
      allows_partial: validated.allowsPartial,
      min_partial_amount: validated.minPartialAmount
        ? validated.minPartialAmount.toFixed(2)
        : null,
      status: 'pending',
      assigned_at: new Date().toISOString(),
    })
    .select()
    .single())

  if (groupError || !group) {
    throw new Error(`Failed to create ticket group: ${groupError?.message}`)
  }

  // Get promoter info
  const { data: promoterData, error: promoterError } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', user.id)
    .single()

  if (promoterError || !promoterData) {
    throw new NotFoundError('Promoter')
  }

  const promoter = promoterData as {
    email: string | null
    full_name: string | null
  }

  // Generate tickets for the group
  const ticketIds: string[] = []
  for (let i = 0; i < validated.quantity; i++) {
    const ticketId = await generateTicket({
      ticketTypeId: validated.ticketTypeId,
      eventId: validated.eventId,
      purchaserId: user.id,
      purchaserEmail: promoter.email || '',
      purchaserName: promoter.full_name || 'Promoter',
    })
    ticketIds.push(ticketId)
  }

  // Update tickets with group_id and promoter_id
  const { error: updateError } = await ((supabase as any)
    .from('tickets')
    .update({
      ticket_group_id: group.id,
      promoter_id: user.id,
      status: TICKET_STATUS.ISSUED,
    })
    .in('id', ticketIds))

  if (updateError) {
    throw new Error(`Failed to link tickets to group: ${updateError.message}`)
  }

  // Update group status to active
  const { error: statusError } = await supabase
    .from('ticket_groups')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', group.id)

  if (statusError) {
    throw new Error(`Failed to activate group: ${statusError.message}`)
  }

  // Log audit event
  await logAuditEvent({
    userId: user.id,
    action: 'group_created',
    resourceType: 'ticket_group',
    resourceId: group.id,
    metadata: {
      eventId: validated.eventId,
      ticketTypeId: validated.ticketTypeId,
      quantity: validated.quantity,
      totalAmount,
    },
  })

  return {
    groupId: group.id,
    totalTickets: validated.quantity,
    totalAmount,
  }
}

