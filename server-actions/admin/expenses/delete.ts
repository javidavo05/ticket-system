'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'
import { ValidationError, AuthorizationError, NotFoundError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { canModifyEvent } from '@/lib/services/admin/events/management'

export async function deleteEventExpense(expenseId: string) {
  // Validate permissions
  let user
  try {
    user = await requireRole(ROLES.ACCOUNTING)
  } catch {
    user = await requireRole(ROLES.EVENT_ADMIN)
  }

  const supabase = await createServiceRoleClient()

  // Get current expense
  const { data: expense, error: fetchError } = await supabase
    .from('event_expenses')
    .select('id, event_id, created_by, category, amount')
    .eq('id', expenseId)
    .single()

  if (fetchError || !expense) {
    throw new NotFoundError('Expense')
  }

  // Validate permissions: only creator or accounting can delete
  const isCreator = expense.created_by === user.id
  let isAccounting = false
  try {
    await requireRole(ROLES.ACCOUNTING)
    isAccounting = true
  } catch {
    // Not accounting
  }

  if (!isCreator && !isAccounting) {
    throw new AuthorizationError('Solo el creador o accounting pueden eliminar este gasto')
  }

  // Delete expense
  const { error: deleteError } = await supabase
    .from('event_expenses')
    .delete()
    .eq('id', expenseId)

  if (deleteError) {
    throw new ValidationError(`Error al eliminar gasto: ${deleteError.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'event_expense_deleted',
      resourceType: 'event_expense',
      resourceId: expenseId,
      metadata: {
        eventId: expense.event_id,
        category: expense.category,
        amount: expense.amount,
      },
    },
    request
  )

  return { success: true }
}

