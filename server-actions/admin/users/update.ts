'use server'

import { getCurrentUser } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/supabase/rls'
import { ROLES } from '@/lib/utils/constants'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { z } from 'zod'

const updateUserSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  profilePhotoUrl: z.string().url().optional(),
  roles: z.array(z.enum(['event_admin', 'accounting', 'scanner', 'promoter'])).optional(),
  isActive: z.boolean().optional(),
})

export async function updateUser(
  userId: string,
  data: {
    fullName?: string
    phone?: string
    profilePhotoUrl?: string
    roles?: ('event_admin' | 'accounting' | 'scanner' | 'promoter')[]
    isActive?: boolean
  }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('No autenticado')
  }

  // Verificar permisos
  const isSuperAdmin = await hasRole(currentUser.id, ROLES.SUPER_ADMIN)
  const isEventAdmin = await hasRole(currentUser.id, ROLES.EVENT_ADMIN)

  if (!isSuperAdmin && !isEventAdmin) {
    throw new Error('No tienes permisos para actualizar usuarios')
  }

  // No permitir que un usuario se modifique a sí mismo ciertos campos
  if (userId === currentUser.id && data.roles) {
    throw new Error('No puedes modificar tus propios roles')
  }

  const validated = updateUserSchema.parse(data)
  const supabase = await createServiceRoleClient()

  // Verificar que el usuario existe
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, full_name, phone, profile_photo_url, deleted_at')
    .eq('id', userId)
    .single()

  if (!existingUser) {
    throw new Error('Usuario no encontrado')
  }

  // Actualizar información básica
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (validated.fullName !== undefined) {
    updateData.full_name = validated.fullName || null
  }
  if (validated.phone !== undefined) {
    updateData.phone = validated.phone || null
  }
  if (validated.profilePhotoUrl !== undefined) {
    updateData.profile_photo_url = validated.profilePhotoUrl || null
  }
  if (validated.isActive !== undefined) {
    updateData.deleted_at = validated.isActive ? null : new Date().toISOString()
  }

  if (Object.keys(updateData).length > 1) {
    const { error: updateError } = await (supabase
      .from('users') as any)
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      throw new Error(`Error al actualizar usuario: ${updateError.message}`)
    }
  }

  // Actualizar roles si se especifican
  if (validated.roles !== undefined) {
    // Eliminar roles existentes
    await (supabase.from('user_roles') as any).delete().eq('user_id', userId)

    // Agregar nuevos roles
    if (validated.roles.length > 0) {
      const rolesToInsert = validated.roles.map((role) => ({
        user_id: userId,
        role,
      }))

      const { error: rolesError } = await (supabase
        .from('user_roles') as any)
        .insert(rolesToInsert)

      if (rolesError) {
        throw new Error(`Error al actualizar roles: ${rolesError.message}`)
      }
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
      action: 'user_updated',
      resourceType: 'user',
      resourceId: userId,
      metadata: {
        changes: validated,
      },
    },
    request as any
  )

  return { success: true }
}

