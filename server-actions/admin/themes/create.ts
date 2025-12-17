'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ValidationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { createThemeSchema } from '@/lib/services/admin/themes/validation'
import { validateThemeConfigWithContract } from '@/lib/services/themes/validation'
import { createThemeVersion } from '@/lib/services/themes/versioning'
import { generateThemeCacheKey } from '@/lib/services/themes/domain'
import type { ThemeConfig } from '@/lib/services/themes/loader'
import {
  validateEventExists,
  validateOrganizationExists,
} from '@/lib/services/admin/themes/helpers'

export async function createTheme(data: {
  name: string
  config: ThemeConfig
  organizationId?: string
  eventId?: string
  isDefault?: boolean
  isActive?: boolean
  parentThemeId?: string
  schemaVersion?: string
}) {
  const user = await requireSuperAdmin()

  // Validate input
  const validated = createThemeSchema.parse(data)

  // Validate config against token contract
  const validatedConfig = await validateThemeConfigWithContract(
    validated.config,
    validated.schemaVersion
  )

  const supabase = await createServiceRoleClient()

  // Validate parent theme exists if provided
  if (validated.parentThemeId) {
    const { data: parentTheme } = await supabase
      .from('themes')
      .select('id')
      .eq('id', validated.parentThemeId)
      .single()

    if (!parentTheme) {
      throw new ValidationError('Parent theme not found')
    }
  }

  // Validate event exists if provided
  if (validated.eventId) {
    await validateEventExists(validated.eventId)
  }

  // Validate organization exists if provided
  if (validated.organizationId) {
    await validateOrganizationExists(validated.organizationId)
  }

  // Check if another default theme exists for organization
  if (validated.isDefault && validated.organizationId) {
    const { data: existingDefault } = await supabase
      .from('themes')
      .select('id')
      .eq('organization_id', validated.organizationId)
      .eq('is_default', true)
      .is('deprecated_at', null)
      .single()

    if (existingDefault) {
      throw new ValidationError('Organization already has a default theme')
    }
  }

  // Create theme
  const { data: theme, error: themeError } = await supabase
    .from('themes')
    .insert({
      name: validated.name,
      config: validatedConfig,
      organization_id: validated.organizationId || null,
      event_id: validated.eventId || null,
      is_default: validated.isDefault || false,
      is_active: validated.isActive !== false,
      parent_theme_id: validated.parentThemeId || null,
      version: 1,
      version_hash: '', // Will be set when creating version
      schema_version: validated.schemaVersion || '1.0.0',
      cache_key: '', // Will be set after version creation
      created_by: user.id,
    })
    .select()
    .single()

  if (themeError || !theme) {
    throw new Error(`Failed to create theme: ${themeError?.message}`)
  }

  // Create initial version
  const version = await createThemeVersion(
    theme.id,
    validatedConfig,
    validated.schemaVersion || '1.0.0',
    user.id
  )

  // Update theme with version hash and cache key
  const { error: updateError } = await supabase
    .from('themes')
    .update({
      version_hash: version.versionHash,
      cache_key: generateThemeCacheKey(theme.id, version.version),
      published_at: new Date().toISOString(),
    })
    .eq('id', theme.id)

  if (updateError) {
    throw new Error(`Failed to update theme with version info: ${updateError.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'theme_created',
      resourceType: 'theme',
      resourceId: theme.id,
      metadata: {
        themeName: validated.name,
        organizationId: validated.organizationId,
        eventId: validated.eventId,
        isDefault: validated.isDefault,
        isActive: validated.isActive,
        version: version.version,
        schemaVersion: validated.schemaVersion || '1.0.0',
      },
    },
    request
  )

  return {
    id: theme.id,
    name: theme.name,
    version: version.version,
    organizationId: theme.organization_id || undefined,
    eventId: theme.event_id || undefined,
    isDefault: theme.is_default || false,
    isActive: theme.is_active !== false,
    createdAt: new Date(theme.created_at),
  }
}
