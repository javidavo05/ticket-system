import { ValidationError } from '@/lib/utils/errors'

/**
 * Validate expense amount is positive
 */
export function validateExpenseAmount(amount: number | string): { valid: boolean; error?: string } {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(amountNum)) {
    return {
      valid: false,
      error: 'Monto inválido',
    }
  }

  if (amountNum <= 0) {
    return {
      valid: false,
      error: 'El monto debe ser mayor a cero',
    }
  }

  return { valid: true }
}

/**
 * Validate expense date is within event date range
 */
export async function validateExpenseDate(
  expenseDate: string,
  eventId: string
): Promise<{ valid: boolean; error?: string }> {
  const { createServiceRoleClient } = await import('@/lib/supabase/server')
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

  const expenseDateObj = new Date(expenseDate)
  const eventStart = new Date(event.start_date)
  const eventEnd = new Date(event.end_date)

  // Allow expenses up to 30 days before event start and 30 days after event end
  const allowedStart = new Date(eventStart)
  allowedStart.setDate(allowedStart.getDate() - 30)
  const allowedEnd = new Date(eventEnd)
  allowedEnd.setDate(allowedEnd.getDate() + 30)

  if (isNaN(expenseDateObj.getTime())) {
    return {
      valid: false,
      error: 'Fecha de gasto inválida',
    }
  }

  if (expenseDateObj < allowedStart || expenseDateObj > allowedEnd) {
    return {
      valid: false,
      error: 'La fecha del gasto debe estar dentro del rango permitido del evento',
    }
  }

  return { valid: true }
}

