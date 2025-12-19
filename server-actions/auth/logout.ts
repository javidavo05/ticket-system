'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Logout user
 * Server-only, audit logged
 */
export async function logout() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  // Sign out from Supabase
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(`Error al cerrar sesión: ${error.message}`)
  }

  // Log audit event if user was authenticated
  if (user) {
    const headersList = await headers()
    const request = new Request('http://localhost', {
      headers: headersList as any,
    })

    await logAuditEvent(
      {
        userId: user.id,
        action: 'user_logout',
        resourceType: 'user',
        resourceId: user.id,
        metadata: {
          method: 'manual_logout',
        },
      },
    request as any
  )
  }

  // Redirect to home page
  redirect('/')
}

