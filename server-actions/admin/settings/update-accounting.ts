'use server'

import { getCurrentUser } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/supabase/rls'
import { ROLES } from '@/lib/utils/constants'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { z } from 'zod'

const updateAccountingSchema = z.object({
  currency: z.string().min(1),
  fiscalPeriod: z.enum(['calendar', 'fiscal']),
  reportFormat: z.enum(['pdf', 'excel', 'csv']),
  invoiceFormat: z.enum(['standard', 'detailed', 'minimal']),
  taxRate: z.number().min(0).max(100).optional(),
  invoicePrefix: z.string().optional(),
  autoGenerateInvoices: z.boolean(),
})

export async function updateAccountingSettings(data: {
  currency: string
  fiscalPeriod: 'calendar' | 'fiscal'
  reportFormat: 'pdf' | 'excel' | 'csv'
  invoiceFormat: 'standard' | 'detailed' | 'minimal'
  taxRate?: number
  invoicePrefix?: string
  autoGenerateInvoices: boolean
}) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('No autenticado')
  }

  // Verificar permisos
  const isAccounting = await hasRole(currentUser.id, ROLES.ACCOUNTING)
  const isSuperAdmin = await hasRole(currentUser.id, ROLES.SUPER_ADMIN)
  const isEventAdmin = await hasRole(currentUser.id, ROLES.EVENT_ADMIN)

  if (!isAccounting && !isSuperAdmin && !isEventAdmin) {
    throw new Error('No tienes permisos para actualizar configuración de contabilidad')
  }

  const validated = updateAccountingSchema.parse(data)
  const supabase = await createServiceRoleClient()

  // Obtener organización del usuario
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', currentUser.id)
    .single()

  // Por ahora, guardar en settings JSONB de la organización
  // En el futuro, esto podría ser una tabla dedicada
  const organizationId = userData
    ? ((userData as any).organization_id as string | null)
    : null
  if (organizationId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single()

    const currentSettings = org ? (((org as any).settings as any) || {}) : {}
    const updatedSettings = {
      ...currentSettings,
      accounting: validated,
    }

    const { error } = await (supabase
      .from('organizations') as any)
      .update({ settings: updatedSettings })
      .eq('id', organizationId)

    if (error) {
      throw new Error(`Error al guardar configuración: ${error.message}`)
    }
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: currentUser.id,
      action: 'accounting_settings_updated',
      resourceType: 'settings',
      resourceId: organizationId || currentUser.id,
      metadata: {
        settings: validated,
      },
    },
    request as any
  )

  return { success: true }
}

