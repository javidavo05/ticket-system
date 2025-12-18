import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'
import type { Theme, ThemeVersion } from './domain'
import { generateThemeCacheKey } from './domain'
import type { ThemeConfig } from './loader'

/**
 * Calculate hash of theme config for change detection
 */
export async function calculateVersionHash(config: ThemeConfig): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(config))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a new version of a theme
 */
export async function createThemeVersion(
  themeId: string,
  config: ThemeConfig,
  schemaVersion: string = '1.0.0',
  createdBy?: string
): Promise<ThemeVersion> {
  const supabase = await createServiceRoleClient()

  // Get current theme
  const { data: currentThemeData, error: themeError } = await (supabase
    .from('themes')
    .select('version')
    .eq('id', themeId)
    .single() as any)

  if (themeError || !currentThemeData) {
    throw new NotFoundError('Theme')
  }

  const currentTheme = currentThemeData as any

  const newVersion = (currentTheme.version as number) + 1
  const versionHash = await calculateVersionHash(config)

  // Check if this version already exists (same hash)
  const { data: existingVersion } = await supabase
    .from('theme_versions')
    .select('id')
    .eq('theme_id', themeId)
    .eq('version_hash', versionHash)
    .single()

  if (existingVersion) {
    throw new ValidationError('Theme config unchanged - version already exists')
  }

  // Create version record
  const { data: version, error: versionError } = await ((supabase as any)
    .from('theme_versions')
    .insert({
      theme_id: themeId,
      version: newVersion,
      config,
      version_hash: versionHash,
      schema_version: schemaVersion,
      created_by: createdBy || null,
    })
    .select()
    .single())

  if (versionError || !version) {
    throw new Error(`Failed to create theme version: ${versionError?.message}`)
  }

  return {
    id: version.id,
    themeId: version.theme_id,
    version: version.version,
    config: version.config as ThemeConfig,
    versionHash: version.version_hash,
    createdBy: version.created_by || undefined,
    createdAt: new Date(version.created_at),
  }
}

/**
 * Publish a theme version (makes it active)
 */
export async function publishThemeVersion(
  themeId: string,
  version: number
): Promise<Theme> {
  const supabase = await createServiceRoleClient()

  // Get version
  const { data: versionData, error: versionError } = await supabase
    .from('theme_versions')
    .select('*')
    .eq('theme_id', themeId)
    .eq('version', version)
    .single()

  if (versionError || !versionData) {
    throw new NotFoundError('Theme version')
  }

  // Update theme with new version
  const { data: updatedTheme, error: updateError } = await ((supabase as any)
    .from('themes')
    .update({
      version: version,
      config: versionData.config,
      version_hash: versionData.version_hash,
      schema_version: versionData.schema_version || '1.0.0',
      cache_key: generateThemeCacheKey(themeId, version),
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', themeId)
    .select()
    .single())

  if (updateError || !updatedTheme) {
    throw new Error(`Failed to publish theme version: ${updateError?.message}`)
  }

  return {
    id: updatedTheme.id,
    name: updatedTheme.name,
    version: updatedTheme.version as number,
    versionHash: updatedTheme.version_hash || '',
    organizationId: updatedTheme.organization_id || undefined,
    eventId: updatedTheme.event_id || undefined,
    isDefault: updatedTheme.is_default || false,
    isActive: updatedTheme.is_active !== false,
    config: updatedTheme.config as ThemeConfig,
    parentThemeId: updatedTheme.parent_theme_id || undefined,
    cacheKey: updatedTheme.cache_key || generateThemeCacheKey(themeId, version),
    publishedAt: updatedTheme.published_at ? new Date(updatedTheme.published_at) : undefined,
    deprecatedAt: updatedTheme.deprecated_at ? new Date(updatedTheme.deprecated_at) : undefined,
    createdAt: new Date(updatedTheme.created_at),
    updatedAt: new Date(updatedTheme.updated_at),
    createdBy: updatedTheme.created_by || undefined,
  }
}

/**
 * Get a specific theme version
 */
export async function getThemeVersion(
  themeId: string,
  version?: number
): Promise<ThemeVersion | null> {
  const supabase = await createServiceRoleClient()

  let query = supabase
    .from('theme_versions')
    .select('*')
    .eq('theme_id', themeId)

  if (version) {
    query = query.eq('version', version)
  } else {
    // Get latest version
    query = query.order('version', { ascending: false }).limit(1)
  }

  const { data: versionData, error } = await query.single()

  if (error || !versionData) {
    return null
  }

  return {
    id: versionData.id,
    themeId: versionData.theme_id,
    version: versionData.version,
    config: versionData.config as ThemeConfig,
    versionHash: versionData.version_hash,
    createdBy: versionData.created_by || undefined,
    createdAt: new Date(versionData.created_at),
  }
}

/**
 * Rollback theme to a previous version
 */
export async function rollbackTheme(
  themeId: string,
  targetVersion: number
): Promise<Theme> {
  const supabase = await createServiceRoleClient()

  // Get target version
  const targetVersionData = await getThemeVersion(themeId, targetVersion)
  if (!targetVersionData) {
    throw new NotFoundError('Theme version')
  }

  // Publish the target version
  return publishThemeVersion(themeId, targetVersion)
}

/**
 * Get all versions of a theme
 */
export async function getThemeVersions(themeId: string): Promise<ThemeVersion[]> {
  const supabase = await createServiceRoleClient()

  const { data: versions, error } = await supabase
    .from('theme_versions')
    .select('*')
    .eq('theme_id', themeId)
    .order('version', { ascending: false })

  if (error) {
    throw error
  }

  return (versions || []).map(v => ({
    id: v.id,
    themeId: v.theme_id,
    version: v.version,
    config: v.config as ThemeConfig,
    versionHash: v.version_hash,
    createdBy: v.created_by || undefined,
    createdAt: new Date(v.created_at),
  }))
}
