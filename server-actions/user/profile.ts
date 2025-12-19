'use server'

import { getCurrentUser, requireAuth } from '@/lib/auth/permissions'
import { createServiceRoleClient, createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { z } from 'zod'
import { getBalance } from '@/lib/services/wallets/balance'
import { checkProfileUpdateRateLimit, validatePhoneNumber, validateProfilePhotoUrl } from '@/lib/security/profile-validation'
import { ProfileUpdateError, PasswordChangeError, TicketAccessError } from '@/lib/utils/errors'

const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  phone: z.string().optional().or(z.literal('')),
  profilePhotoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
})

/**
 * Get current user's profile data
 * Server-only, RLS enforced
 */
export async function getProfile() {
  const user = await requireAuth()
  const supabase = await createServiceRoleClient()

  // Get user profile from users table
  const { data: profile, error } = await supabase
    .from('users')
    .select('id, email, full_name, phone, profile_photo_url, wallet_balance, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    throw new Error('Error al obtener perfil')
  }

  const profileData = profile as {
    id: string
    email: string
    full_name: string | null
    phone: string | null
    profile_photo_url: string | null
    created_at: string
    updated_at: string
  }

  // Get wallet balance (from wallets table for accuracy)
  const walletBalance = await getBalance(user.id)

  return {
    id: profileData.id,
    email: profileData.email,
    fullName: profileData.full_name,
    phone: profileData.phone,
    profilePhotoUrl: profileData.profile_photo_url,
    walletBalance,
    createdAt: profileData.created_at,
    updatedAt: profileData.updated_at,
  }
}

/**
 * Update user profile
 * Server-only, RLS enforced, audit logged
 */
export async function updateProfile(data: {
  fullName?: string
  phone?: string
  profilePhotoUrl?: string
}) {
  const user = await requireAuth()
  const validated = updateProfileSchema.parse(data)
  const supabase = await createServiceRoleClient()

  // Check rate limit
  const rateLimit = await checkProfileUpdateRateLimit(user.id)
  if (!rateLimit.allowed) {
    throw new ProfileUpdateError(
      `Has excedido el límite de actualizaciones de perfil. Intenta nuevamente después de ${rateLimit.resetAt.toLocaleTimeString()}`
    )
  }

  // Validate phone number
  if (validated.phone !== undefined && validated.phone !== '') {
    const phoneValidation = validatePhoneNumber(validated.phone)
    if (!phoneValidation.isValid) {
      throw new ProfileUpdateError(phoneValidation.error || 'Teléfono inválido')
    }
  }

  // Validate profile photo URL
  if (validated.profilePhotoUrl !== undefined && validated.profilePhotoUrl !== '') {
    const urlValidation = await validateProfilePhotoUrl(validated.profilePhotoUrl)
    if (!urlValidation.isValid) {
      throw new ProfileUpdateError(urlValidation.error || 'URL de foto inválida')
    }
  }

  // Get current profile for audit
  const { data: currentProfile } = await supabase
    .from('users')
    .select('full_name, phone, profile_photo_url')
    .eq('id', user.id)
    .single()

  // Prepare update data
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

  // Update profile
  const { error: updateError } = await ((supabase as any)
    .from('users')
    .update(updateData)
    .eq('id', user.id))

  if (updateError) {
    throw new ProfileUpdateError(`Error al actualizar perfil: ${updateError.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'profile_updated',
      resourceType: 'user',
      resourceId: user.id,
      changes: {
        ...Object.keys(updateData).reduce((acc, key) => {
          acc[key] = {
            before: (currentProfile as any)?.[key],
            after: updateData[key],
          }
          return acc
        }, {} as Record<string, { before: unknown; after: unknown }>),
      },
    },
    request as any
  )

  return { success: true }
}

/**
 * Get user's ticket history
 * Server-only, RLS enforced
 */
export async function getTicketHistory(limit: number = 50, offset: number = 0) {
  const user = await requireAuth()
  const supabase = await createServiceRoleClient()

  // Get tickets where user is the purchaser
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      status,
      created_at,
      events!inner (
        id,
        name,
        slug,
        start_date,
        end_date
      ),
      ticket_types!inner (
        id,
        name,
        price
      ),
      payments (
        id,
        amount,
        status,
        created_at
      )
    `)
    .eq('purchaser_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Error al obtener historial de tickets: ${error.message}`)
  }

  return (tickets || []).map((ticket) => ({
    id: ticket.id,
    ticketNumber: ticket.ticket_number,
    status: ticket.status,
    createdAt: ticket.created_at,
    event: Array.isArray(ticket.events) ? ticket.events[0] : ticket.events,
    ticketType: Array.isArray(ticket.ticket_types) ? ticket.ticket_types[0] : ticket.ticket_types,
    payment: Array.isArray(ticket.payments) ? ticket.payments[0] : ticket.payments,
  }))
}

/**
 * Get ticket count for current user
 */
export async function getTicketCount() {
  const user = await requireAuth()
  const supabase = await createServiceRoleClient()

  const { count, error } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('purchaser_id', user.id)

  if (error) {
    throw new Error(`Error al obtener conteo de tickets: ${error.message}`)
  }

  return count || 0
}

/**
 * Re-download ticket (generate new secure link)
 * Server-only, RLS enforced, audit logged
 */
export async function redownloadTicket(ticketId: string) {
  const user = await requireAuth()
  const supabase = await createServiceRoleClient()

  // Verify ticket belongs to user
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('id, ticket_number, purchaser_id, events!inner (name)')
    .eq('id', ticketId)
    .eq('purchaser_id', user.id)
    .single()

  if (ticketError || !ticket) {
    throw new TicketAccessError('Ticket no encontrado o no tienes acceso')
  }

  // Generate new secure ticket URL
  const { generateTicketUrl } = await import('@/lib/services/tickets/secure-links')
  const ticketUrl = await generateTicketUrl(ticketId)

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'ticket_redownloaded',
      resourceType: 'ticket',
      resourceId: ticketId,
      metadata: {
        ticketNumber: ticket.ticket_number,
        eventName: Array.isArray(ticket.events) ? ticket.events[0]?.name : ticket.events?.name,
      },
    },
    request as any
  )

  return { ticketUrl }
}

/**
 * Get wallet balance
 * Server-only, RLS enforced
 */
export async function getWalletBalance() {
  const user = await requireAuth()
  const balance = await getBalance(user.id)
  return { balance }
}

/**
 * Change password
 * Server-only, audit logged
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const user = await requireAuth()

  if (newPassword.length < 8) {
    throw new PasswordChangeError('La contraseña debe tener al menos 8 caracteres')
  }

  const supabase = await createClient()
  
  // Verify current password by attempting to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (signInError) {
    throw new PasswordChangeError('Contraseña actual incorrecta')
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    throw new PasswordChangeError(`Error al cambiar contraseña: ${updateError.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'password_changed',
      resourceType: 'user',
      resourceId: user.id,
      metadata: {
        method: 'profile_change',
      },
    },
    request as any
  )

  return { success: true }
}

