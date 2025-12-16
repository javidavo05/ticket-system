import { createServiceRoleClient } from '@/lib/supabase/server'
import { cache } from 'react'

// Simple in-memory cache (use Redis in production)
const themeCache = new Map<string, { theme: unknown; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export interface ThemeConfig {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  typography: {
    fontFamily: string
    headingFont: string
    sizes: Record<string, string>
  }
  layout: {
    variant: 'centered' | 'wide' | 'narrow'
    heroStyle: 'image' | 'video' | 'gradient'
  }
  animations: {
    enabled: boolean
    transitions: Record<string, string>
  }
}

const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#000000',
    secondary: '#666666',
    accent: '#FFD700',
    background: '#FFFFFF',
    text: '#000000',
  },
  typography: {
    fontFamily: 'system-ui, sans-serif',
    headingFont: 'system-ui, sans-serif',
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    },
  },
  layout: {
    variant: 'centered',
    heroStyle: 'image',
  },
  animations: {
    enabled: true,
    transitions: {
      default: '150ms ease-in-out',
    },
  },
}

export const getTheme = cache(async (eventId?: string): Promise<ThemeConfig> => {
  if (!eventId) {
    return defaultTheme
  }

  // Check cache
  const cached = themeCache.get(eventId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.theme as ThemeConfig
  }

  const supabase = await createServiceRoleClient()

  // Try to get event-specific theme
  const { data: event } = await supabase
    .from('events')
    .select('theme_id')
    .eq('id', eventId)
    .single()

  if (event?.theme_id) {
    const { data: theme } = await supabase
      .from('themes')
      .select('config')
      .eq('id', event.theme_id)
      .eq('is_active', true)
      .single()

    if (theme?.config) {
      const themeConfig = { ...defaultTheme, ...(theme.config as Partial<ThemeConfig>) }
      themeCache.set(eventId, {
        theme: themeConfig,
        expiresAt: Date.now() + CACHE_TTL,
      })
      return themeConfig
    }
  }

  // Return default theme
  themeCache.set(eventId, {
    theme: defaultTheme,
    expiresAt: Date.now() + CACHE_TTL,
  })
  return defaultTheme
})

export function invalidateThemeCache(eventId?: string): void {
  if (eventId) {
    themeCache.delete(eventId)
  } else {
    themeCache.clear()
  }
}

