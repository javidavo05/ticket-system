'use server'

import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'

export async function resetPassword(newPassword: string) {
  if (newPassword.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres')
  }

  const supabase = await createClient()

  // Obtener el usuario actual
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('No se pudo verificar la sesión. Por favor, usa el enlace de recuperación nuevamente.')
  }

  // Actualizar contraseña
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    throw new Error(updateError.message)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'password_reset',
      resourceType: 'user',
      resourceId: user.id,
      metadata: {
        method: 'email_reset',
      },
    },
    request as any
  )

  return { success: true }
}

