'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
})

export async function registerUser(data: {
  email: string
  password: string
  fullName?: string
}) {
  // Validar datos
  const validated = registerSchema.parse(data)

  const supabase = await createClient()

  // Registrar usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: validated.email,
    password: validated.password,
    options: {
      data: {
        full_name: validated.fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email`,
    },
  })

  if (authError) {
    throw new Error(authError.message)
  }

  if (!authData.user) {
    throw new Error('Error al crear usuario')
  }

  // Crear registro en tabla users
  const serviceClient = await createServiceRoleClient()
  const { error: userError } = await ((serviceClient as any).from('users').insert({
    id: authData.user.id,
    email: validated.email,
    full_name: validated.fullName || null,
  }))

  if (userError) {
    // Si falla la inserción en users pero el usuario de auth se creó,
    // intentar actualizar en lugar de insertar
    const { error: updateError } = await serviceClient
      .from('users')
      .update({
        email: validated.email,
        full_name: validated.fullName || null,
      })
      .eq('id', authData.user.id)

    if (updateError) {
      console.error('Error al crear/actualizar usuario en tabla users:', updateError)
      // No lanzar error aquí porque el usuario de auth ya se creó
    }
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList,
  })

  await logAuditEvent(
    {
      userId: authData.user.id,
      action: 'user_registered',
      resourceType: 'user',
      resourceId: authData.user.id,
      metadata: {
        email: validated.email,
        method: 'email',
      },
    },
    request
  )

  return {
    user: authData.user,
    session: authData.session,
  }
}

