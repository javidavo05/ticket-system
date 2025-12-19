'use server'

import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'

export async function verifyEmail(hash: string) {
  const supabase = await createClient()

  // Verificar el token de email
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: hash,
    type: 'email',
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error('No se pudo verificar el usuario')
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList,
  })

  await logAuditEvent(
    {
      userId: data.user.id,
      action: 'email_verified',
      resourceType: 'user',
      resourceId: data.user.id,
      metadata: {
        email: data.user.email,
      },
    },
    request as any
  )

  return { success: true, user: data.user }
}

