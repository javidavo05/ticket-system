'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'
import { NotFoundError } from '@/lib/utils/errors'
import { canManageEvent, canViewEventAnalytics } from '@/lib/auth/permissions'

export async function getEventExpenses(eventId: string) {
  try {
    await requireRole(ROLES.ACCOUNTING)
  } catch {
    await requireRole(ROLES.EVENT_ADMIN)
  }

  const supabase = await createServiceRoleClient()

  // Verify event exists
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .is('deleted_at', null)
    .single()

  if (!event) {
    throw new NotFoundError('Event')
  }

  // Get expenses
  const { data: expensesData, error } = await supabase
    .from('event_expenses')
    .select(`
      *,
      users!event_expenses_created_by_fkey (
        id,
        email,
        full_name
      )
    `)
    .eq('event_id', eventId)
    .order('expense_date', { ascending: false })

  if (error) {
    throw new Error(`Error al obtener gastos: ${error.message}`)
  }

  const expenses = (expensesData || []) as Array<{
    amount: string | number
    category: string
    [key: string]: any
  }>

  // Calculate totals
  const total = expenses.reduce((sum, exp) => {
    return sum + parseFloat(exp.amount as string)
  }, 0)

  // Group by category
  const byCategory = expenses.reduce((acc, exp) => {
    const category = exp.category
    if (!acc[category]) {
      acc[category] = { count: 0, total: 0 }
    }
    acc[category].count++
    acc[category].total += parseFloat(exp.amount as string)
    return acc
  }, {} as Record<string, { count: number; total: number }>)

  return {
    expenses: expenses.map((exp) => ({
      ...exp,
      amount: parseFloat(exp.amount as string),
      createdBy: Array.isArray(exp.users) ? exp.users[0] : exp.users,
    })),
    statistics: {
      total,
      count: expenses.length,
      byCategory,
    },
  }
}

