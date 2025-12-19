'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ValidationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { invalidateTheme } from '@/lib/services/themes/cache-strategy'
import { canDeleteTheme, validateThemeExists } from '@/lib/services/admin/themes/helpers'

export async function deleteTheme(themeId: string) {
  const user = await requireSuperAdmin()

  // Validate theme exists
  await validateThemeExists(themeId)

  // Check if theme can be deleted
  const canDelete = await canDeleteTheme(themeId)
  if (!canDelete.canDelete) {
    throw new ValidationError(
      `Cannot delete theme: ${canDelete.reasons.join(', ')}`
    )
  }

  const supabase = await createServiceRoleClient()

  // Get theme before deletion for audit
  const { data: themeData, error: getError } = await supabase
    .from('themes')
    .select('id, name, version, organization_id, event_id')
    .eq('id', themeId)
    .single()

  if (getError || !themeData) {
    throw new ValidationError('Theme not found')
  }

  const theme = themeData as {
    id: string
    name: string
    version: number
    organization_id: string | null
    event_id: string | null
  }

  // Soft delete: set deprecated_at and deactivate
  const { error: deleteError } = await ((supabase as any)
    .from('themes')
    .update({
      deprecated_at: new Date().toISOString(),
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', themeId))

  if (deleteError) {
    throw new Error(`Failed to delete theme: ${deleteError.message}`)
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
      action: 'theme_deleted',
      resourceType: 'theme',
      resourceId: themeId,
      metadata: {
        themeName: theme.name,
        version: theme.version,
        organizationId: theme.organization_id,
        eventId: theme.event_id,
      },
    },
    request as any
  )

  return { success: true }
}
