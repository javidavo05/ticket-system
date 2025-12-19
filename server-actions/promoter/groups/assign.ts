'use server'

import { requirePromoter } from '@/lib/auth/permissions'
import { ValidationError } from '@/lib/utils/errors'
import { bulkAssignTickets, assignTicket, unassignTicket } from '@/lib/services/promoter/groups/assignment'
import { z } from 'zod'

const bulkAssignTicketsSchema = z.object({
  groupId: z.string().uuid(),
  assignments: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().min(1),
      phone: z.string().optional(),
    })
  ),
})

const assignTicketSchema = z.object({
  ticketId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
})

const unassignTicketSchema = z.object({
  ticketId: z.string().uuid(),
})

export async function bulkAssignTicketsAction(formData: FormData) {
  const user = await requirePromoter()

  // Parse assignments from form data
  const groupId = formData.get('groupId') as string
  const assignmentsJson = formData.get('assignments') as string

  if (!assignmentsJson) {
    throw new ValidationError('Assignments are required')
  }

  let assignments: Array<{ email: string; name: string; phone?: string }>
  try {
    assignments = JSON.parse(assignmentsJson)
  } catch {
    throw new ValidationError('Invalid assignments format')
  }

  const validated = bulkAssignTicketsSchema.parse({ groupId, assignments })

  const result = await bulkAssignTickets(validated.groupId, user.id, validated.assignments as Array<{ email: string; name: string; phone?: string }>)

  return result
}

export async function assignTicketAction(formData: FormData) {
  const user = await requirePromoter()

  const data = {
    ticketId: formData.get('ticketId') as string,
    email: formData.get('email') as string,
    name: formData.get('name') as string,
    phone: formData.get('phone') as string | undefined,
  }

  const validated = assignTicketSchema.parse(data)

  await assignTicket(validated.ticketId, user.id, {
    email: validated.email,
    name: validated.name,
    phone: validated.phone,
  })

  return { success: true }
}

export async function unassignTicketAction(formData: FormData) {
  const user = await requirePromoter()

  const data = {
    ticketId: formData.get('ticketId') as string,
  }

  const validated = unassignTicketSchema.parse(data)

  await unassignTicket(validated.ticketId, user.id)

  return { success: true }
}

