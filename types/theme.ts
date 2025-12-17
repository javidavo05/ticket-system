/**
 * Theme-related types for component consumption
 * Exports all types needed by frontend components
 */

import type { ThemeConfig } from '@/lib/services/themes/loader'
import type { SanitizedThemeConfig } from '@/lib/services/themes/sanitization'

/**
 * Re-export sanitized theme config for component use
 */
export type { SanitizedThemeConfig }

/**
 * Re-export theme config type
 */
export type { ThemeConfig }

/**
 * Theme context value
 * Provides typed access to theme data in React components
 */
export interface ThemeContextValue {
  config: SanitizedThemeConfig
  source: 'domain' | 'event' | 'organization' | 'default'
  // Helper getters for common tokens
  colors: ThemeConfig['colors']
  typography: ThemeConfig['typography']
  spacing: ThemeConfig['spacing']
  layout: ThemeConfig['layout']
  animations: ThemeConfig['animations']
  assets?: ThemeConfig['assets']
}

/**
 * Theme provider props
 */
export interface ThemeProviderProps {
  theme: SanitizedThemeConfig
  source?: 'domain' | 'event' | 'organization' | 'default'
  children: React.ReactNode
}
