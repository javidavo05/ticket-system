'use server'

import { getCurrentUser } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/supabase/rls'
import { ROLES } from '@/lib/utils/constants'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['event_admin', 'accounting', 'scanner', 'promoter']),
  organizationId: z.string().uuid().optional(),
})

export async function createUser(data: {
  email: string
  password: string
  fullName?: string
  phone?: string
  role: 'event_admin' | 'accounting' | 'scanner' | 'promoter'
  organizationId?: string
}) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('No autenticado')
  }

  // Verificar permisos
  const isSuperAdmin = await hasRole(currentUser.id, ROLES.SUPER_ADMIN)
  const isEventAdmin = await hasRole(currentUser.id, ROLES.EVENT_ADMIN)

  if (!isSuperAdmin && !isEventAdmin) {
    throw new Error('No tienes permisos para crear usuarios')
  }

  const validated = createUserSchema.parse(data)
  const supabase = await createServiceRoleClient()

  // Verificar que el email no exista
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', validated.email)
    .is('deleted_at', null)
    .single()

  if (existingUser) {
    throw new Error('El email ya está en uso')
  }

  // Crear usuario en Supabase Auth usando service role client (tiene permisos admin)
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: validated.email,
    password: validated.password,
    email_confirm: true,
  })

  if (authError || !authUser.user) {
    throw new Error(`Error al crear usuario: ${authError?.message || 'Error desconocido'}`)
  }

  // Crear registro en tabla users
  const { error: userError } = await (supabase.from('users') as any).insert({
    id: authUser.user.id,
    email: validated.email,
    full_name: validated.fullName || null,
    phone: validated.phone || null,
    organization_id: validated.organizationId || null,
  })

  if (userError) {
    // Si falla, intentar eliminar el usuario de auth
    await supabase.auth.admin.deleteUser(authUser.user.id)
    throw new Error(`Error al crear perfil: ${userError.message}`)
  }

  // Asignar rol
  const { error: roleError } = await (supabase.from('user_roles') as any).insert({
    user_id: authUser.user.id,
    role: validated.role,
    organization_id: validated.organizationId || null,
  })

  if (roleError) {
    throw new Error(`Error al asignar rol: ${roleError.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: currentUser.id,
      action: 'user_created',
      resourceType: 'user',
      resourceId: authUser.user.id,
      metadata: {
        email: validated.email,
        role: validated.role,
      },
    },
    request as any
  )

  return {
    success: true,
    userId: authUser.user.id,
  }
}

