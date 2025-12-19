'use server'

import { getCurrentUser } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface AdminPreferences {
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
}

export async function getAdminPreferences(): Promise<AdminPreferences> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('No autenticado')
  }

  const supabase = await createServiceRoleClient()

  // Por ahora, retornar valores por defecto
  // En el futuro, esto podría venir de una tabla user_preferences o campo JSONB en users
  return {
    language: 'es',
    timezone: 'America/Panama',
    notifications: {
      email: true,
      push: false,
      events: true,
      payments: true,
      reports: true,
    },
    theme: 'system',
  }
}

