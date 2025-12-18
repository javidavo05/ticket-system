import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Theme, ThemeResolutionContext } from './domain'
import { mapThemeFromDB } from './resolution'
import { withCircuitBreaker } from './circuit-breaker'

/**
 * Batch get multiple themes by IDs
 * Reduces database round trips
 */
export async function batchGetThemes(themeIds: string[]): Promise<Map<string, Theme>> {
  if (themeIds.length === 0) {
    return new Map()
  }

  return withCircuitBreaker(async () => {
    const supabase = await createServiceRoleClient()

    const { data: themes, error } = await supabase
      .from('themes')
      .select('*')
      .in('id', themeIds)
      .eq('is_active', true)
      .is('deprecated_at', null)

    if (error) {
      throw new Error(`Failed to batch get themes: ${error.message}`)
    }

    const themeMap = new Map<string, Theme>()
    const themesData = (themes || []) as any[]
    for (const theme of themesData) {
      const mapped = mapThemeFromDB(theme)
      themeMap.set(theme.id, mapped)
    }

    return themeMap
  })
}

/**
 * Prefetch theme context
 * Loads likely-needed themes into cache before they're requested
 */
export async function prefetchThemeContext(
  context: ThemeResolutionContext
): Promise<void> {
  // Prefetch in background (don't await)
  // This is fire-and-forget optimization
  setImmediate(async () => {
    try {
      const supabase = await createServiceRoleClient()
      const themeIds: string[] = []

      // Prefetch event theme if eventId provided
      if (context.eventId) {
        const { data: event } = await supabase
          .from('events')
          .select('theme_id, organization_id')
          .eq('id', context.eventId)
          .single()

        if (event?.theme_id) {
          themeIds.push(event.theme_id)
        }
        if (event?.organization_id) {
          // Will prefetch org theme below
          context.organizationId = event.organization_id
        }
      }

      // Prefetch organization theme if organizationId provided
      if (context.organizationId) {
        const { data: orgTheme } = await supabase
          .from('themes')
          .select('id')
          .eq('organization_id', context.organizationId)
          .eq('is_default', true)
          .eq('is_active', true)
          .is('deprecated_at', null)
          .limit(1)
          .single()

        if (orgTheme?.id) {
          themeIds.push(orgTheme.id)
        }
      }

      // Batch fetch themes
      if (themeIds.length > 0) {
        await batchGetThemes(themeIds)
      }
    } catch (error) {
      // Silently fail prefetch - it's just an optimization
      console.debug('Theme prefetch failed:', error)
    }
  })
}

/**
 * Get theme with optimized query
 * Uses batch fetching when possible
 */
export async function getThemeOptimized(themeId: string): Promise<Theme | null> {
  const result = await batchGetThemes([themeId])
  return result.get(themeId) || null
}
