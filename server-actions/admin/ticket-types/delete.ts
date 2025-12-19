'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'
import { ValidationError, AuthorizationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { canModifyEvent } from '@/lib/services/admin/events/management'
import { canDeleteTicketType } from '@/lib/services/admin/ticket-types/validation'

export async function deleteTicketType(ticketTypeId: string) {
  const user = await requireRole(ROLES.EVENT_ADMIN)

  const supabase = await createServiceRoleClient()

  // Get ticket type
  const { data: ticketTypeData, error: fetchError } = await supabase
    .from('ticket_types')
    .select('id, event_id, name')
    .eq('id', ticketTypeId)
    .single()

  if (fetchError || !ticketTypeData) {
    throw new ValidationError('Tipo de ticket no encontrado')
  }

  const ticketType = ticketTypeData as {
    id: string
    event_id: string
    name: string
  }

  // Validate permissions for event
  if (!(await canModifyEvent(user.id, ticketType.event_id))) {
    throw new AuthorizationError('No tienes permisos para eliminar este tipo de ticket')
  }

  // Check if can delete
  const deleteCheck = await canDeleteTicketType(ticketTypeId)
  if (!deleteCheck.canDelete) {
    throw new ValidationError(
      `No se puede eliminar el tipo de ticket: ${deleteCheck.reasons.join(', ')}`
    )
  }

  // Delete ticket type (CASCADE will handle related records)
  const { error: deleteError } = await supabase
    .from('ticket_types')
    .delete()
    .eq('id', ticketTypeId)

  if (deleteError) {
    throw new ValidationError(`Error al eliminar tipo de ticket: ${deleteError.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'ticket_type_deleted',
      resourceType: 'ticket_type',
      resourceId: ticketTypeId,
      metadata: {
        eventId: ticketType.event_id,
        name: ticketType.name,
      },
    },
    request as any
  )

  return { success: true }
}

