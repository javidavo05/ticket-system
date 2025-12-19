'use server'

import { getCurrentUser } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { z } from 'zod'

const updatePreferencesSchema = z.object({
  language: z.string(),
  timezone: z.string(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    events: z.boolean(),
    payments: z.boolean(),
    reports: z.boolean(),
  }),
  theme: z.enum(['light', 'dark', 'system']),
})

export async function updateAdminPreferences(data: {
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    events: boolean
    payments: boolean
    reports: boolean
  }
  theme: 'light' | 'dark' | 'system'
}) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('No autenticado')
  }

  const validated = updatePreferencesSchema.parse(data)
  const supabase = await createServiceRoleClient()

  // Por ahora, guardar en localStorage del cliente o en una tabla futura
  // Por ahora solo logueamos el evento de auditoría
  // En el futuro, esto podría guardarse en user_preferences o campo JSONB en users

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: currentUser.id,
      action: 'preferences_updated',
      resourceType: 'user',
      resourceId: currentUser.id,
      metadata: {
        preferences: validated,
      },
    },
    request as any
  )

  return { success: true }
}

