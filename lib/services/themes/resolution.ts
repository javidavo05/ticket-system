import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError } from '@/lib/utils/errors'
import type {
  Theme,
  ThemeResolutionContext,
  ThemeResolutionResult,
} from './domain'
import { generateThemeCacheKey, generateThemeCacheTags } from './domain'
import { defaultThemeConfig, type ThemeConfig } from './loader'

/**
 * Get default system theme
 */
export function getDefaultSystemTheme(): Theme {
  return {
    id: 'default',
    name: 'Default Theme',
    version: 1,
    versionHash: '',
    isDefault: true,
    isActive: true,
    config: defaultThemeConfig,
    cacheKey: 'theme:default:v1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Map database theme to domain model
 */
function mapThemeFromDB(dbTheme: any): Theme {
  return {
    id: dbTheme.id,
    name: dbTheme.name,
    version: dbTheme.version || 1,
    versionHash: dbTheme.version_hash || '',
    organizationId: dbTheme.organization_id || undefined,
    eventId: dbTheme.event_id || undefined,
    isDefault: dbTheme.is_default || false,
    isActive: dbTheme.is_active !== false,
    config: dbTheme.config as ThemeConfig,
    parentThemeId: dbTheme.parent_theme_id || undefined,
    cacheKey: dbTheme.cache_key || generateThemeCacheKey(dbTheme.id, dbTheme.version || 1),
    publishedAt: dbTheme.published_at ? new Date(dbTheme.published_at) : undefined,
    deprecatedAt: dbTheme.deprecated_at ? new Date(dbTheme.deprecated_at) : undefined,
    createdAt: new Date(dbTheme.created_at),
    updatedAt: new Date(dbTheme.updated_at),
    createdBy: dbTheme.created_by || undefined,
  }
}

/**
 * Get theme by event ID
 */
export async function getThemeByEvent(eventId: string): Promise<Theme | null> {
  const supabase = await createServiceRoleClient()

  // First, check if event has a theme_id assigned
  const { data: event } = await supabase
    .from('events')
    .select('theme_id, organization_id')
    .eq('id', eventId)
    .single()

  if (!event) {
    return null
  }

  // If event has theme_id, get that theme
  if (event.theme_id) {
    const { data: theme } = await supabase
      .from('themes')
      .select('*')
      .eq('id', event.theme_id)
      .eq('is_active', true)
      .is('deprecated_at', null)
      .single()

    if (theme) {
      return mapThemeFromDB(theme)
    }
  }

  // Otherwise, look for event-specific theme
  const { data: theme } = await supabase
    .from('themes')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .is('deprecated_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (theme) {
    return mapThemeFromDB(theme)
  }

  return null
}

/**
 * Get default theme by organization ID
 */
export async function getThemeByOrganization(organizationId: string): Promise<Theme | null> {
  const supabase = await createServiceRoleClient()

  const { data: theme } = await supabase
    .from('themes')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_default', true)
    .eq('is_active', true)
    .is('deprecated_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (theme) {
    return mapThemeFromDB(theme)
  }

  return null
}

/**
 * Get default system theme
 */
export async function getDefaultTheme(): Promise<Theme> {
  return getDefaultSystemTheme()
}

/**
 * Resolve theme with fallback chain: Event → Organization → Default
 */
export async function resolveTheme(
  context: ThemeResolutionContext
): Promise<ThemeResolutionResult> {
  const supabase = await createServiceRoleClient()

  // Step 1: Try to get theme by event
  if (context.eventId) {
    const eventTheme = await getThemeByEvent(context.eventId)
    if (eventTheme) {
      return {
        theme: eventTheme,
        source: 'event',
        cacheKey: eventTheme.cacheKey,
        cacheTags: generateThemeCacheTags(eventTheme),
      }
    }

    // If event theme not found, get organization from event
    const { data: event } = await supabase
      .from('events')
      .select('organization_id')
      .eq('id', context.eventId)
      .single()

    if (event?.organization_id) {
      context.organizationId = event.organization_id
    }
  }

  // Step 2: Try to get theme by organization (default theme)
  if (context.organizationId) {
    const orgTheme = await getThemeByOrganization(context.organizationId)
    if (orgTheme) {
      return {
        theme: orgTheme,
        source: 'organization',
        cacheKey: orgTheme.cacheKey,
        cacheTags: generateThemeCacheTags(orgTheme),
      }
    }
  }

  // Step 3: Fallback to default system theme
  const defaultTheme = await getDefaultTheme()
  return {
    theme: defaultTheme,
    source: 'default',
    cacheKey: defaultTheme.cacheKey,
    cacheTags: generateThemeCacheTags(defaultTheme),
  }
}

/**
 * Resolve theme by event slug
 */
export async function getThemeBySlug(slug: string): Promise<ThemeResolutionResult> {
  const supabase = await createServiceRoleClient()

  // Get event by slug
  const { data: event } = await supabase
    .from('events')
    .select('id, organization_id')
    .eq('slug', slug)
    .in('status', ['published', 'live'])
    .is('deleted_at', null)
    .single()

  if (!event) {
    // Return default theme if event not found
    const defaultTheme = await getDefaultTheme()
    return {
      theme: defaultTheme,
      source: 'default',
      cacheKey: defaultTheme.cacheKey,
      cacheTags: generateThemeCacheTags(defaultTheme),
    }
  }

  return resolveTheme({
    eventId: event.id,
    organizationId: event.organization_id || undefined,
  })
}
