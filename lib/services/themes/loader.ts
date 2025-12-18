import { createServiceRoleClient } from '@/lib/supabase/server'
import { cache } from 'react'
import type { NextRequest } from 'next/server'
import { resolveTheme, getThemeBySlug as resolveThemeBySlug } from './resolution'
import { getCachedTheme } from './cache-strategy'
import type {
  ThemeResolutionContext,
  ThemeResolutionResult,
} from './domain'

export interface ThemeConfig {
  colors: {
    // Primary scale (50-900)
    primary: {
      50: string
      100: string
      200: string
      300: string
      400: string
      500: string
      600: string
      700: string
      800: string
      900: string
    }
    // Secondary scale
    secondary: {
      50: string
      100: string
      200: string
      300: string
      400: string
      500: string
      600: string
      700: string
      800: string
      900: string
    }
    // Semantic colors
    success: {
      50?: string
      100?: string
      200?: string
      300?: string
      400?: string
      500: string
      600?: string
      700?: string
      800?: string
      900?: string
    }
    error: {
      50?: string
      100?: string
      200?: string
      300?: string
      400?: string
      500: string
      600?: string
      700?: string
      800?: string
      900?: string
    }
    warning: {
      50?: string
      100?: string
      200?: string
      300?: string
      400?: string
      500: string
      600?: string
      700?: string
      800?: string
      900?: string
    }
    info: {
      50?: string
      100?: string
      200?: string
      300?: string
      400?: string
      500: string
      600?: string
      700?: string
      800?: string
      900?: string
    }
    // Neutral colors
    neutral: {
      50: string
      100: string
      200: string
      300: string
      400: string
      500: string
      600: string
      700: string
      800: string
      900: string
    }
    // Accent (simplified)
    accent?: {
      500: string
    }
    // Background and text
    background: {
      default: string
    }
    text: {
      default: string
    }
    // Dark mode variants (optional)
    dark?: {
      primary?: { 50?: string; 100?: string; 200?: string; 300?: string; 400?: string; 500: string; 600?: string; 700?: string; 800?: string; 900?: string }
      secondary?: { 50?: string; 100?: string; 200?: string; 300?: string; 400?: string; 500: string; 600?: string; 700?: string; 800?: string; 900?: string }
      success?: { 500: string }
      error?: { 500: string }
      warning?: { 500: string }
      info?: { 500: string }
      background?: { default: string }
      text?: { default: string }
    }
  }
  typography: {
    fontFamily: string
    headingFont: string
    sizes: Record<string, string>
    weights: {
      light: number
      normal: number
      medium: number
      semibold: number
      bold: number
    }
    lineHeights: Record<string, string>
    letterSpacing: Record<string, string>
  }
  spacing: {
    tokens: Record<string, string>
    scale: number[]
  }
  layout: {
    variant: 'centered' | 'wide' | 'narrow'
    heroStyle: 'image' | 'video' | 'gradient'
    breakpoints: {
      sm: string
      md: string
      lg: string
      xl: string
      '2xl': string
    }
    containerWidths: Record<string, string>
    gridColumns: number
  }
  animations: {
    enabled: boolean
    transitions: Record<string, string>
    durations: Record<string, string>
    easings: Record<string, string>
  }
  assets?: {
    logo?: string
    logoDark?: string
    favicon?: string
    background?: string
    backgroundMobile?: string
    ogImage?: string
  }
}

// Import default theme config from centralized config
import { defaultThemeConfig as defaultTheme } from '@/config/theme-defaults'

/**
 * Get theme configuration (backward compatible)
 * @deprecated Use getThemeResolution instead
 */
export const getTheme = cache(async (eventId?: string): Promise<ThemeConfig> => {
  if (!eventId) {
    return defaultTheme
  }

  const result = await getThemeResolution({ eventId })
  return result.theme.config
})

/**
 * Get theme with full resolution and caching
 */
export async function getThemeResolution(
  context: ThemeResolutionContext
): Promise<ThemeResolutionResult> {
  // Generate cache key from context
  const cacheKeyParts: string[] = []
  if (context.eventId) cacheKeyParts.push(`event:${context.eventId}`)
  if (context.organizationId) cacheKeyParts.push(`org:${context.organizationId}`)
  if (context.slug) cacheKeyParts.push(`slug:${context.slug}`)
  const cacheKey = cacheKeyParts.join('|') || 'default'

  // Use multi-layer cache with resolution
  const result = await getCachedTheme(
    cacheKey,
    context.eventId ? [`event:${context.eventId}`] : [],
    async () => {
      const resolution = await resolveTheme(context)
      return resolution.theme
    }
  )

  // Get full resolution result
  const resolution = await resolveTheme(context)
  return {
    ...resolution,
    theme: result,
  }
}

/**
 * Get theme by event slug
 */
export async function getThemeBySlug(slug: string): Promise<ThemeResolutionResult> {
  const resolution = await resolveThemeBySlug(slug)
  
  // Cache the result
  const cached = await getCachedTheme(
    `slug:${slug}`,
    resolution.cacheTags,
    async () => resolution.theme
  )

  return {
    ...resolution,
    theme: cached,
  }
}

/**
 * Get theme for a request (extracts context from request)
 */
export async function getThemeForRequest(
  request: NextRequest
): Promise<ThemeResolutionResult> {
  const url = new URL(request.url)
  const eventId = url.searchParams.get('eventId') || undefined
  const organizationId = url.searchParams.get('organizationId') || undefined
  const slug = url.pathname.match(/\/events\/([^/]+)/)?.[1] || undefined

  return getThemeResolution({
    eventId,
    organizationId,
    slug,
  })
}

/**
 * Invalidate theme cache (backward compatible)
 */
export function invalidateThemeCache(eventId?: string): void {
  // This is now handled by cache-strategy
  // Keep for backward compatibility
  if (eventId) {
    import('./cache-strategy').then(({ invalidateEventTheme }) => {
      invalidateEventTheme(eventId)
    })
  }
}

