'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'
import { ValidationError, AuthorizationError, NotFoundError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { z } from 'zod'
import { canModifyEvent } from '@/lib/services/admin/events/management'
import { validateExpenseAmount, validateExpenseDate } from '@/lib/services/admin/expenses/validation'

const expenseUpdateSchema = z.object({
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().optional(),
  expenseDate: z.string().datetime().optional(),
})

export async function updateEventExpense(expenseId: string, data: {
  category?: string
  description?: string
  amount?: string
  currency?: string
  expenseDate?: string
}) {
  // Validate permissions
  let user
  try {
    user = await requireRole(ROLES.ACCOUNTING)
  } catch {
    user = await requireRole(ROLES.EVENT_ADMIN)
  }

  const supabase = await createServiceRoleClient()

  // Get current expense
  const { data: currentExpense, error: fetchError } = await supabase
    .from('event_expenses')
    .select('id, event_id, created_by, amount, expense_date')
    .eq('id', expenseId)
    .single()

  if (fetchError || !currentExpense) {
    throw new NotFoundError('Expense')
  }

  // Validate permissions: creator or accounting or event admin
  const isCreator = currentExpense.created_by === user.id
  let isAccounting = false
  try {
    await requireRole(ROLES.ACCOUNTING)
    isAccounting = true
  } catch {
    // Not accounting
  }

  if (!isCreator && !isAccounting) {
    // Check if user is event admin for this event
    const canModify = await canModifyEvent(user.id, currentExpense.event_id)
    if (!canModify) {
      throw new AuthorizationError('No tienes permisos para modificar este gasto')
    }
  }

  // Validate input
  const validated = expenseUpdateSchema.parse(data)

  // Validate amount if provided
  if (validated.amount !== undefined) {
    const amountValidation = validateExpenseAmount(validated.amount)
    if (!amountValidation.valid) {
      throw new ValidationError(amountValidation.error || 'Monto inválido')
    }
  }

  // Validate date if provided
  if (validated.expenseDate !== undefined) {
    const dateValidation = await validateExpenseDate(validated.expenseDate, currentExpense.event_id)
    if (!dateValidation.valid) {
      throw new ValidationError(dateValidation.error || 'Fecha inválida')
    }
  }

  // Prepare update data
  const updateData: Record<string, any> = {}

  if (validated.category !== undefined) updateData.category = validated.category
  if (validated.description !== undefined) updateData.description = validated.description
  if (validated.amount !== undefined) updateData.amount = validated.amount
  if (validated.currency !== undefined) updateData.currency = validated.currency
  if (validated.expenseDate !== undefined) updateData.expense_date = validated.expenseDate

  // Update expense
  const { data: updatedExpense, error: updateError } = await supabase
    .from('event_expenses')
    .update(updateData)
    .eq('id', expenseId)
    .select()
    .single()

  if (updateError || !updatedExpense) {
    throw new ValidationError(`Error al actualizar gasto: ${updateError?.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'event_expense_updated',
      resourceType: 'event_expense',
      resourceId: expenseId,
      changes: {
        before: currentExpense,
        after: updateData,
      },
    },
    request
  )

  return updatedExpense
}

