'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError } from '@/lib/utils/errors'
import type { ThemeConfig } from '@/lib/services/themes/loader'
import { getThemeAssignments } from '@/lib/services/admin/themes/helpers'

export async function getThemeById(themeId: string) {
  await requireSuperAdmin()

  const supabase = await createServiceRoleClient()

  // Get theme
  const { data: themeData, error: themeError } = await supabase
    .from('themes')
    .select('*')
    .eq('id', themeId)
    .single()

  if (themeError || !themeData) {
    throw new NotFoundError('Theme')
  }

  const theme = themeData as any

  // Get assignments
  const assignments = await getThemeAssignments(themeId)

  // Get version count
  const { count: versionCount } = await supabase
    .from('theme_versions')
    .select('*', { count: 'exact', head: true })
    .eq('theme_id', themeId)

  return {
    id: theme.id,
    name: theme.name,
    version: theme.version as number,
    versionHash: theme.version_hash || '',
    organizationId: theme.organization_id || undefined,
    eventId: theme.event_id || undefined,
    isDefault: theme.is_default || false,
    isActive: theme.is_active !== false,
    config: theme.config as ThemeConfig,
    parentThemeId: theme.parent_theme_id || undefined,
    schemaVersion: (theme.schema_version as string) || '1.0.0',
    publishedAt: theme.published_at ? new Date(theme.published_at) : undefined,
    deprecatedAt: theme.deprecated_at ? new Date(theme.deprecated_at) : undefined,
    createdAt: new Date(theme.created_at),
    updatedAt: new Date(theme.updated_at),
    createdBy: theme.created_by || undefined,
    assignments: {
      events: assignments.events,
      organizations: assignments.organizations,
      isDefaultForOrganization: assignments.isDefaultForOrganization,
    },
    versionCount: versionCount || 0,
  }
}
