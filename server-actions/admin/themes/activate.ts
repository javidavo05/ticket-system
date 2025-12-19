'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { invalidateTheme } from '@/lib/services/themes/cache-strategy'
import { validateThemeExists } from '@/lib/services/admin/themes/helpers'

export async function activateTheme(themeId: string) {
  const user = await requireSuperAdmin()

  // Validate theme exists
  await validateThemeExists(themeId)

  const supabase = await createServiceRoleClient()

  // Get theme info
  const { data: themeData, error: getError } = await supabase
    .from('themes')
    .select('id, name, is_active, version')
    .eq('id', themeId)
    .single()

  if (getError || !themeData) {
    throw new NotFoundError('Theme')
  }

  const theme = themeData as {
    id: string
    name: string
    is_active: boolean
    version: number
  }

  if (theme.is_active) {
    return { success: true, message: 'Theme is already active' }
  }

  // Activate theme
  const { error: updateError } = await supabase
    .from('themes')
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', themeId)

  if (updateError) {
    throw new Error(`Failed to activate theme: ${updateError.message}`)
  }

  // Invalidate cache
  await invalidateTheme(themeId, theme.version as number)

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'theme_activated',
      resourceType: 'theme',
      resourceId: themeId,
      metadata: {
        themeName: theme.name,
      },
    },
    request
  )

  return { success: true }
}

export async function deactivateTheme(themeId: string) {
  const user = await requireSuperAdmin()

  // Validate theme exists
  await validateThemeExists(themeId)

  const supabase = await createServiceRoleClient()

  // Get theme info
  const { data: theme, error: getError } = await supabase
    .from('themes')
    .select('id, name, is_active, version')
    .eq('id', themeId)
    .single()

  if (getError || !theme) {
    throw new NotFoundError('Theme')
  }

  if (!theme.is_active) {
    return { success: true, message: 'Theme is already inactive' }
  }

  // Deactivate theme
  const { error: updateError } = await supabase
    .from('themes')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', themeId)

  if (updateError) {
    throw new Error(`Failed to deactivate theme: ${updateError.message}`)
  }

  // Invalidate cache
  await invalidateTheme(themeId, theme.version as number)

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'theme_deactivated',
      resourceType: 'theme',
      resourceId: themeId,
      metadata: {
        themeName: theme.name,
      },
    },
    request
  )

  return { success: true }
}
