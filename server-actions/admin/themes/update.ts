'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { updateThemeSchema } from '@/lib/services/admin/themes/validation'
import { validateThemeConfigWithContract } from '@/lib/services/themes/validation'
import { createThemeVersion } from '@/lib/services/themes/versioning'
import { invalidateTheme } from '@/lib/services/themes/cache-strategy'
import { generateThemeCacheKey } from '@/lib/services/themes/domain'
import type { ThemeConfig } from '@/lib/services/themes/loader'
import { validateThemeExists } from '@/lib/services/admin/themes/helpers'

export async function updateTheme(
  themeId: string,
  data: {
    name?: string
    config?: ThemeConfig
    isActive?: boolean
    isDefault?: boolean
    schemaVersion?: string
  }
) {
  const user = await requireSuperAdmin()

  // Validate input
  const validated = updateThemeSchema.parse(data)

  // Validate theme exists
  await validateThemeExists(themeId)

  const supabase = await createServiceRoleClient()

  // Get current theme for comparison
  const { data: currentThemeData, error: getError } = await supabase
    .from('themes')
    .select('*')
    .eq('id', themeId)
    .single()

  if (getError || !currentThemeData) {
    throw new NotFoundError('Theme')
  }

  const currentTheme = currentThemeData as any

  const changes: Record<string, { before: unknown; after: unknown }> = {}
  const updates: Record<string, unknown> = {}

  // Update name if provided
  if (validated.name !== undefined && validated.name !== currentTheme.name) {
    changes.name = { before: currentTheme.name, after: validated.name }
    updates.name = validated.name
  }

  // Update isActive if provided
  if (validated.isActive !== undefined && validated.isActive !== currentTheme.is_active) {
    changes.isActive = { before: currentTheme.is_active, after: validated.isActive }
    updates.is_active = validated.isActive
  }

  // Update isDefault if provided
  if (validated.isDefault !== undefined && validated.isDefault !== currentTheme.is_default) {
    changes.isDefault = { before: currentTheme.is_default, after: validated.isDefault }
    updates.is_default = validated.isDefault
  }

  // Handle config update (creates new version)
  let newVersion = currentTheme.version as number
  if (validated.config) {
    // Validate config against token contract
    const validatedConfig = await validateThemeConfigWithContract(
      validated.config,
      validated.schemaVersion || (currentTheme.schema_version as string)
    )

    // Check if config actually changed
    const currentConfig = currentTheme.config as ThemeConfig
    const configChanged = JSON.stringify(currentConfig) !== JSON.stringify(validatedConfig)

    if (configChanged) {
      // Create new version
      const version = await createThemeVersion(
        themeId,
        validatedConfig,
        validated.schemaVersion || (currentTheme.schema_version as string) || '1.0.0',
        user.id
      )

      newVersion = version.version
      updates.config = validatedConfig
      updates.version = newVersion
      updates.version_hash = version.versionHash
      updates.cache_key = generateThemeCacheKey(themeId, newVersion)
      updates.published_at = new Date().toISOString()
      updates.schema_version = validated.schemaVersion || currentTheme.schema_version || '1.0.0'

      changes.config = {
        before: `Version ${currentTheme.version}`,
        after: `Version ${newVersion}`,
      }
    }
  }

  // Update schema version if provided (without config change)
  if (validated.schemaVersion && !validated.config) {
    updates.schema_version = validated.schemaVersion
    changes.schemaVersion = {
      before: currentTheme.schema_version,
      after: validated.schemaVersion,
    }
  }

  // Only update if there are changes
  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString()

    const { error: updateError } = await ((supabase as any)
      .from('themes')
      .update(updates)
      .eq('id', themeId))

    if (updateError) {
      throw new Error(`Failed to update theme: ${updateError.message}`)
    }

    // Invalidate cache
    await invalidateTheme(themeId, newVersion)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'theme_updated',
      resourceType: 'theme',
      resourceId: themeId,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
      metadata: {
        themeName: currentTheme.name,
        newVersion: newVersion !== currentTheme.version ? newVersion : undefined,
      },
    },
    request as any
  )

  return {
    success: true,
    version: newVersion,
    changes: Object.keys(changes),
  }
}
