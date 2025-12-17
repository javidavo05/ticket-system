'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ticketTypeCreateSchema } from '@/lib/utils/validation'
import { ROLES } from '@/lib/utils/constants'
import { ValidationError, AuthorizationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { canModifyEvent } from '@/lib/services/admin/events/management'
import { validateTicketTypeDates, canModifyTicketType } from '@/lib/services/admin/ticket-types/validation'

export async function updateTicketType(ticketTypeId: string, data: {
  name?: string
  description?: string
  price?: string
  quantityAvailable?: number
  maxPerPurchase?: number
  isMultiScan?: boolean
  maxScans?: number
  saleStart?: string
  saleEnd?: string
}) {
  const user = await requireRole(ROLES.EVENT_ADMIN)

  const supabase = await createServiceRoleClient()

  // Get current ticket type
  const { data: currentTicketType, error: fetchError } = await supabase
    .from('ticket_types')
    .select('event_id, quantity_available, quantity_sold')
    .eq('id', ticketTypeId)
    .single()

  if (fetchError || !currentTicketType) {
    throw new ValidationError('Tipo de ticket no encontrado')
  }

  // Validate permissions for event
  if (!(await canModifyEvent(user.id, currentTicketType.event_id))) {
    throw new AuthorizationError('No tienes permisos para modificar este tipo de ticket')
  }

  // Check if can modify
  const modifyCheck = await canModifyTicketType(ticketTypeId)
  if (!modifyCheck.canModify) {
    throw new ValidationError(modifyCheck.reason || 'No se puede modificar este tipo de ticket')
  }

  // Validate input (partial)
  const validated = ticketTypeCreateSchema.partial().parse(data)

  // Validate price if provided
  if (validated.price !== undefined) {
    const priceNum = parseFloat(validated.price)
    if (priceNum <= 0) {
      throw new ValidationError('El precio debe ser mayor a cero')
    }
  }

  // Validate quantity available if provided
  if (validated.quantityAvailable !== undefined) {
    if (validated.quantityAvailable <= 0) {
      throw new ValidationError('La cantidad disponible debe ser mayor a cero')
    }
    // Cannot reduce below quantity sold
    if (validated.quantityAvailable < (currentTicketType.quantity_sold || 0)) {
      throw new ValidationError(
        `No se puede reducir la cantidad disponible por debajo de tickets vendidos (${currentTicketType.quantity_sold})`
      )
    }
  }

  // Validate dates
  if (validated.saleStart !== undefined || validated.saleEnd !== undefined) {
    const dateValidation = await validateTicketTypeDates(
      currentTicketType.event_id,
      validated.saleStart,
      validated.saleEnd
    )
    if (!dateValidation.valid) {
      throw new ValidationError(dateValidation.error || 'Fechas inválidas')
    }
  }

  // Prepare update data
  const updateData: Record<string, any> = {}

  if (validated.name !== undefined) updateData.name = validated.name
  if (validated.description !== undefined) updateData.description = validated.description || null
  if (validated.price !== undefined) updateData.price = validated.price
  if (validated.quantityAvailable !== undefined) updateData.quantity_available = validated.quantityAvailable
  if (validated.maxPerPurchase !== undefined) updateData.max_per_purchase = validated.maxPerPurchase || null
  if (validated.isMultiScan !== undefined) updateData.is_multi_scan = validated.isMultiScan
  if (validated.maxScans !== undefined) updateData.max_scans = validated.maxScans || null
  if (validated.saleStart !== undefined) updateData.sale_start = validated.saleStart || null
  if (validated.saleEnd !== undefined) updateData.sale_end = validated.saleEnd || null

  // Update ticket type
  const { data: updatedTicketType, error: updateError } = await supabase
    .from('ticket_types')
    .update(updateData)
    .eq('id', ticketTypeId)
    .select()
    .single()

  if (updateError || !updatedTicketType) {
    throw new ValidationError(`Error al actualizar tipo de ticket: ${updateError?.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'ticket_type_updated',
      resourceType: 'ticket_type',
      resourceId: ticketTypeId,
      changes: {
        before: currentTicketType,
        after: updateData,
      },
    },
    request
  )

  return updatedTicketType
}

