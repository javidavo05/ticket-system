'use server'

import { validateTicket } from '@/lib/services/tickets/validation'

export async function validateTicketAction(qrSignature: string) {
  const result = await validateTicket(qrSignature)
  return result
}

