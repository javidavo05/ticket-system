'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'
import { ValidationError, AuthorizationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { z } from 'zod'
import { canModifyEvent } from '@/lib/services/admin/events/management'
import { validateExpenseAmount, validateExpenseDate } from '@/lib/services/admin/expenses/validation'

const expenseCreateSchema = z.object({
  eventId: z.string().uuid(),
  category: z.string().min(1, 'La categoría es requerida'),
  description: z.string().min(1, 'La descripción es requerida'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Monto inválido'),
  currency: z.string().default('USD'),
  expenseDate: z.string().datetime(),
})

export async function createEventExpense(eventId: string, data: {
  category: string
  description: string
  amount: string
  currency?: string
  expenseDate: string
}) {
  // Validate permissions (event_admin or accounting)
  let user
  try {
    user = await requireRole(ROLES.ACCOUNTING)
  } catch {
    user = await requireRole(ROLES.EVENT_ADMIN)
  }

  // Validate event access (accounting can always create, event_admin needs event access)
  try {
    await requireRole(ROLES.ACCOUNTING)
    // Accounting can always create expenses
  } catch {
    // Not accounting, check event admin access
    if (!(await canModifyEvent(user.id, eventId))) {
      throw new AuthorizationError('No tienes permisos para crear gastos para este evento')
    }
  }

  // Validate input
  const validated = expenseCreateSchema.parse({
    ...data,
    eventId,
    currency: data.currency || 'USD',
  })

  // Validate amount
  const amountValidation = validateExpenseAmount(validated.amount)
  if (!amountValidation.valid) {
    throw new ValidationError(amountValidation.error || 'Monto inválido')
  }

  // Validate date
  const dateValidation = await validateExpenseDate(validated.expenseDate, eventId)
  if (!dateValidation.valid) {
    throw new ValidationError(dateValidation.error || 'Fecha inválida')
  }

  const supabase = await createServiceRoleClient()

  // Create expense
  const { data: expense, error } = await supabase
    .from('event_expenses')
    .insert({
      event_id: eventId,
      category: validated.category,
      description: validated.description,
      amount: validated.amount,
      currency: validated.currency,
      expense_date: validated.expenseDate,
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !expense) {
    throw new ValidationError(`Error al crear gasto: ${error?.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'event_expense_created',
      resourceType: 'event_expense',
      resourceId: expense.id,
      metadata: {
        eventId,
        category: validated.category,
        amount: validated.amount,
      },
    },
    request
  )

  return expense
}

