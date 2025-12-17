'use server'

import { getCurrentUser } from '@/lib/auth/permissions'

/**
 * Get current user (server action for client components)
 */
export async function getCurrentUserAction() {
  const user = await getCurrentUser()
  return user
}

