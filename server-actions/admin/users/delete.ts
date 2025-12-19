'use server'

import { getCurrentUser } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/supabase/rls'
import { ROLES } from '@/lib/utils/constants'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'

export async function deleteUser(userId: string, hardDelete: boolean = false) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('No autenticado')
  }

  // Verificar permisos
  const isSuperAdmin = await hasRole(currentUser.id, ROLES.SUPER_ADMIN)
  if (!isSuperAdmin) {
    throw new Error('Solo los super administradores pueden eliminar usuarios')
  }

  // No permitir auto-eliminación
  if (userId === currentUser.id) {
    throw new Error('No puedes eliminar tu propia cuenta')
  }

  const supabase = await createServiceRoleClient()

  // Verificar que el usuario existe
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .single()

  if (!existingUser) {
    throw new Error('Usuario no encontrado')
  }

  if (hardDelete) {
    // Hard delete: eliminar completamente
    // Primero eliminar roles
    await (supabase.from('user_roles') as any).delete().eq('user_id', userId)

    // Eliminar de tabla users
    const { error: userError } = await (supabase.from('users') as any).delete().eq('id', userId)

    if (userError) {
      throw new Error(`Error al eliminar usuario: ${userError.message}`)
    }

    // Eliminar de Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) {
      throw new Error(`Error al eliminar usuario de auth: ${authError.message}`)
    }
  } else {
    // Soft delete: marcar como eliminado
    const { error: updateError } = await (supabase
      .from('users') as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      throw new Error(`Error al desactivar usuario: ${updateError.message}`)
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
      action: hardDelete ? 'user_deleted' : 'user_deactivated',
      resourceType: 'user',
      resourceId: userId,
      metadata: {
        email: (existingUser as any).email,
        hardDelete,
      },
    },
    request as any
  )

  return { success: true }
}

