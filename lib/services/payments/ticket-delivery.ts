import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendTicketDeliveryEmail } from '@/lib/services/email/templates/ticket'

/**
 * Send ticket delivery emails for all tickets in a payment
 * This is called after payment is completed
 */
export async function sendTicketsForPayment(
  paymentId: string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const supabase = await createServiceRoleClient()

  // Get all tickets for this payment
  const { data: tickets, error: ticketsError } = await (supabase
    .from('tickets')
    .select('id, purchaser_email, ticket_number')
    .eq('payment_id', paymentId)
    .in('status', ['paid', 'issued']) as any)

  if (ticketsError) {
    throw new Error(`Failed to fetch tickets: ${ticketsError.message}`)
  }

  if (!tickets || tickets.length === 0) {
    return { sent: 0, failed: 0, errors: [] }
  }

  const ticketsData = (tickets || []) as any[]
  let sent = 0
  let failed = 0
  const errors: string[] = []

  // Send email for each ticket
  for (const ticket of ticketsData) {
    try {
      const result = await sendTicketDeliveryEmail(ticket.id)

      if (result.success) {
        sent++
      } else {
        failed++
        errors.push(`Ticket ${ticket.ticket_number}: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      failed++
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push(`Ticket ${ticket.ticket_number}: ${errorMessage}`)
      console.error(`Failed to send email for ticket ${ticket.id}:`, error)
    }
  }

  return { sent, failed, errors }
}

