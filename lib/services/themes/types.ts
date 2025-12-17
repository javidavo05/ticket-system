import { z } from 'zod'
import type { ThemeConfig } from './loader'
import type { SanitizedThemeConfig } from './sanitization'
import type { Theme } from './domain'
import { themeConfigSchema } from './validation'

/**
 * Validated theme config (passed Zod validation)
 */
export type ValidatedThemeConfig = z.infer<typeof themeConfigSchema>

/**
 * Safe theme response (sanitized config only)
 */
export type SafeThemeResponse = Omit<Theme, 'config'> & {
  config: SanitizedThemeConfig
}

/**
 * Theme resolution result with validated config
 */
export interface ValidatedThemeResolutionResult {
  theme: Theme & {
    config: ValidatedThemeConfig
  }
  source: 'domain' | 'event' | 'organization' | 'default'
  cacheKey: string
  cacheTags: string[]
}

/**
 * Sanitized theme resolution result
 */
export interface SanitizedThemeResolutionResult {
  theme: Theme & {
    config: SanitizedThemeConfig
  }
  source: 'domain' | 'event' | 'organization' | 'default'
  cacheKey: string
  cacheTags: string[]
}
