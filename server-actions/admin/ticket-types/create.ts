'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ticketTypeCreateSchema } from '@/lib/utils/validation'
import { ROLES } from '@/lib/utils/constants'
import { ValidationError, AuthorizationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { canModifyEvent } from '@/lib/services/admin/events/management'
import { validateTicketTypeDates } from '@/lib/services/admin/ticket-types/validation'

export async function createTicketType(eventId: string, data: {
  name: string
  description?: string
  price: string
  quantityAvailable: number
  maxPerPurchase?: number
  isMultiScan?: boolean
  maxScans?: number
  saleStart?: string
  saleEnd?: string
}) {
  const user = await requireRole(ROLES.EVENT_ADMIN)

  // Validate permissions for event
  if (!(await canModifyEvent(user.id, eventId))) {
    throw new AuthorizationError('No tienes permisos para crear tipos de tickets para este evento')
  }

  // Validate input
  const validated = ticketTypeCreateSchema.parse({
    ...data,
    eventId,
  })

  // Validate price is positive
  const priceNum = parseFloat(validated.price)
  if (priceNum <= 0) {
    throw new ValidationError('El precio debe ser mayor a cero')
  }

  // Validate quantity is positive
  if (validated.quantityAvailable <= 0) {
    throw new ValidationError('La cantidad disponible debe ser mayor a cero')
  }

  // Validate dates
  const dateValidation = await validateTicketTypeDates(
    eventId,
    validated.saleStart,
    validated.saleEnd
  )
  if (!dateValidation.valid) {
    throw new ValidationError(dateValidation.error || 'Fechas inválidas')
  }

  const supabase = await createServiceRoleClient()

  // Create ticket type
  const { data: ticketType, error } = await ((supabase as any)
    .from('ticket_types')
    .insert({
      event_id: eventId,
      name: validated.name,
      description: validated.description || null,
      price: validated.price,
      quantity_available: validated.quantityAvailable,
      quantity_sold: 0,
      max_per_purchase: validated.maxPerPurchase || null,
      is_multi_scan: validated.isMultiScan || false,
      max_scans: validated.maxScans || null,
      sale_start: validated.saleStart || null,
      sale_end: validated.saleEnd || null,
    })
    .select()
    .single())

  if (error || !ticketType) {
    throw new ValidationError(`Error al crear tipo de ticket: ${error?.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'ticket_type_created',
      resourceType: 'ticket_type',
      resourceId: ticketType.id,
      metadata: {
        eventId,
        name: validated.name,
        price: validated.price,
      },
    },
    request as any
  )

  return ticketType
}

