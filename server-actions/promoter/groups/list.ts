'use server'

import { requirePromoter } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const getPromoterGroupsSchema = z.object({
  eventId: z.string().uuid().optional(),
  status: z.enum(['pending', 'active', 'completed', 'cancelled']).optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
})

export async function getPromoterGroupsAction(formData: FormData) {
  const user = await requirePromoter()

  // Parse and validate input
  const data = {
    eventId: formData.get('eventId') as string | undefined,
    status: formData.get('status') as string | undefined,
    limit: formData.get('limit') ? parseInt(formData.get('limit') as string) : 50,
    offset: formData.get('offset') ? parseInt(formData.get('offset') as string) : 0,
  }

  const validated = getPromoterGroupsSchema.parse(data)

  const supabase = await createServiceRoleClient()

  // Build query
  let query = supabase
    .from('ticket_groups')
    .select(
      '*, event:events(id, name, slug), ticket_type:ticket_types(id, name, price), payment:payments(id, status)'
    )
    .eq('promoter_id', user.id)
    .order('created_at', { ascending: false })
    .range(validated.offset, validated.offset + validated.limit - 1)

  if (validated.eventId) {
    query = query.eq('event_id', validated.eventId)
  }

  if (validated.status) {
    query = query.eq('status', validated.status)
  }

  const { data: groupsData, error } = await query

  if (error) {
    throw new Error(`Failed to fetch groups: ${error.message}`)
  }

  const groups = (groupsData || []) as Array<{
    total_amount: string | number
    amount_paid: string | number
    total_tickets: number
    tickets_assigned: number
    tickets_sold: number
    [key: string]: any
  }>

  // Calculate statistics for each group
  const groupsWithStats = await Promise.all(
    groups.map(async (group) => {
      const totalAmount = parseFloat(group.total_amount as string)
      const amountPaid = parseFloat(group.amount_paid as string)
      const remainingAmount = totalAmount - amountPaid
      const paymentComplete = amountPaid >= totalAmount

      return {
        ...group,
        statistics: {
          totalTickets: group.total_tickets,
          ticketsAssigned: group.tickets_assigned,
          ticketsSold: group.tickets_sold,
          totalAmount,
          amountPaid,
          remainingAmount,
          paymentComplete,
        },
      }
    })
  )

  return groupsWithStats
}

