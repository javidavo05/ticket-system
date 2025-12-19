'use server'

import { getCurrentUser } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/supabase/rls'
import { ROLES } from '@/lib/utils/constants'

export interface AccountingSettings {
  currency: string
  fiscalPeriod: string
  reportFormat: string
  invoiceFormat: string
  taxRate?: number
  invoicePrefix?: string
  autoGenerateInvoices: boolean
}

export async function getAccountingSettings(): Promise<AccountingSettings> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('No autenticado')
  }

  // Verificar permisos de contabilidad
  const isAccounting = await hasRole(currentUser.id, ROLES.ACCOUNTING)
  const isSuperAdmin = await hasRole(currentUser.id, ROLES.SUPER_ADMIN)
  const isEventAdmin = await hasRole(currentUser.id, ROLES.EVENT_ADMIN)

  if (!isAccounting && !isSuperAdmin && !isEventAdmin) {
    throw new Error('No tienes permisos para ver configuración de contabilidad')
  }

  const supabase = await createServiceRoleClient()

  // Intentar obtener configuración de la organización del usuario
  const { data: user } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', currentUser.id)
    .single()

  // Por ahora, retornar valores por defecto
  // En el futuro, esto podría venir de una tabla organization_settings
  return {
    currency: 'USD',
    fiscalPeriod: 'calendar',
    reportFormat: 'pdf',
    invoiceFormat: 'standard',
    taxRate: 0,
    invoicePrefix: 'INV',
    autoGenerateInvoices: false,
  }
}

