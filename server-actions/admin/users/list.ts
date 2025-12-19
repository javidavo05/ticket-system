'use server'

import { getCurrentUser } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/supabase/rls'
import { ROLES } from '@/lib/utils/constants'

export interface UserListItem {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  profilePhotoUrl: string | null
  roles: string[]
  createdAt: string
  isActive: boolean
}

export async function listUsers(options?: {
  search?: string
  role?: string
  page?: number
  limit?: number
}) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('No autenticado')
  }

  // Verificar que el usuario tenga permisos de admin
  const isSuperAdmin = await hasRole(currentUser.id, ROLES.SUPER_ADMIN)
  const isEventAdmin = await hasRole(currentUser.id, ROLES.EVENT_ADMIN)
  
  if (!isSuperAdmin && !isEventAdmin) {
    throw new Error('No tienes permisos para ver usuarios')
  }

  const supabase = await createServiceRoleClient()
  const page = options?.page || 1
  const limit = options?.limit || 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('users')
    .select(`
      id,
      email,
      full_name,
      phone,
      profile_photo_url,
      created_at,
      deleted_at
    `, { count: 'exact' })
    .is('deleted_at', null)

  // Búsqueda por email o nombre
  if (options?.search) {
    query = query.or(`email.ilike.%${options.search}%,full_name.ilike.%${options.search}%`)
  }

  // Ordenar por fecha de creación
  query = query.order('created_at', { ascending: false })

  // Paginación
  query = query.range(offset, offset + limit - 1)

  const { data: users, error, count } = await query

  if (error) {
    throw new Error(`Error al obtener usuarios: ${error.message}`)
  }

  // Obtener roles para cada usuario
  const usersWithRoles: UserListItem[] = await Promise.all(
    (users || []).map(async (user: any) => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        profilePhotoUrl: user.profile_photo_url,
        roles: roles?.map((r: any) => r.role) || [],
        createdAt: user.created_at,
        isActive: !user.deleted_at,
      }
    })
  )

  // Filtrar por rol si se especifica
  let filteredUsers = usersWithRoles
  if (options?.role) {
    filteredUsers = usersWithRoles.filter((u) => u.roles.includes(options.role!))
  }

  return {
    users: filteredUsers,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  }
}

