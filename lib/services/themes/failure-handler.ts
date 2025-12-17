import type { Theme, ThemeResolutionContext } from './domain'
import { defaultThemeConfig } from '@/config/theme-defaults'
import { getDefaultSystemTheme } from './resolution'
import { mergePartialConfig, detectMissingTokens } from './partial-config'
import { validateThemeConfigWithContract } from './validation'
import { sanitizeThemeConfig } from './sanitization'
import { logThemeFailure } from './theme-logger'
import type { ThemeConfig } from './loader'

export interface FailureContext {
  scenario: 'missing' | 'invalid' | 'partial' | 'cache_failure' | 'db_failure'
  error?: Error
  partialConfig?: Partial<ThemeConfig>
  cacheKey?: string
  themeId?: string
  originalTheme?: Theme
}

/**
 * Handle theme failure and return a valid theme
 * Never throws - always returns a theme (default if necessary)
 */
export async function handleThemeFailure(
  context: FailureContext,
  resolutionContext: ThemeResolutionContext
): Promise<Theme> {
  const { scenario, error, partialConfig, cacheKey, themeId, originalTheme } = context

  // Log the failure
  logThemeFailure(
    scenario === 'db_failure' ? 'error' : 'warn',
    scenario,
    {
      cacheKey,
      themeId,
      eventId: resolutionContext.eventId,
      organizationId: resolutionContext.organizationId,
      error: error?.message,
      errorStack: error?.stack,
    },
    'fallback_to_default'
  )

  // Handle based on scenario
  switch (scenario) {
    case 'missing': {
      // Config is completely missing
      return getDefaultThemeWithContext(resolutionContext, cacheKey)
    }

    case 'invalid': {
      // Config exists but is invalid
      if (partialConfig) {
        try {
          // Try to repair by merging with defaults
          const merged = mergePartialConfig(partialConfig)
          const validated = await validateThemeConfigWithContract(merged)
          const sanitized = sanitizeThemeConfig(validated)

          // Create repaired theme
          if (originalTheme) {
            return {
              ...originalTheme,
              config: sanitized,
            }
          }

          // If no original theme, return default
          return getDefaultThemeWithContext(resolutionContext, cacheKey)
        } catch (repairError) {
          // Repair failed, use default
          logThemeFailure(
            'error',
            'repair_failed',
            {
              cacheKey,
              themeId,
              repairError: repairError instanceof Error ? repairError.message : String(repairError),
            },
            'fallback_to_default'
          )
          return getDefaultThemeWithContext(resolutionContext, cacheKey)
        }
      }

      // No partial config, use default
      return getDefaultThemeWithContext(resolutionContext, cacheKey)
    }

    case 'partial': {
      // Config is partially defined
      if (partialConfig) {
        try {
          // Merge with defaults
          const merged = mergePartialConfig(partialConfig)
          const missing = detectMissingTokens(partialConfig)

          logThemeFailure(
            'warn',
            'partial_config_merged',
            {
              cacheKey,
              themeId,
              missingTokens: missing,
            },
            'merged_with_defaults'
          )

          const validated = await validateThemeConfigWithContract(merged)
          const sanitized = sanitizeThemeConfig(validated)

          // Create merged theme
          if (originalTheme) {
            return {
              ...originalTheme,
              config: sanitized,
            }
          }

          // If no original theme, return default
          return getDefaultThemeWithContext(resolutionContext, cacheKey)
        } catch (mergeError) {
          // Merge failed, use default
          logThemeFailure(
            'error',
            'merge_failed',
            {
              cacheKey,
              themeId,
              mergeError: mergeError instanceof Error ? mergeError.message : String(mergeError),
            },
            'fallback_to_default'
          )
          return getDefaultThemeWithContext(resolutionContext, cacheKey)
        }
      }

      // No partial config, use default
      return getDefaultThemeWithContext(resolutionContext, cacheKey)
    }

    case 'cache_failure': {
      // Cache read/write failed
      // Try to get from memory cache or DB directly
      // If that fails, use default
      logThemeFailure(
        'warn',
        'cache_failure',
        {
          cacheKey,
          themeId,
        },
        'trying_alternate_sources'
      )

      // Try cache recovery first
      try {
        const { recoverCache } = await import('./cache-recovery')
        return await recoverCache(cacheKey || 'default', async () => {
          // This will be called by recoverCache if needed
          throw new Error('Cache recovery fallback')
        })
      } catch (error) {
        // Recovery failed, use default
      return getDefaultThemeWithContext(resolutionContext, cacheKey)
      }
    }

    case 'db_failure': {
      // Database query failed
      // Use cached theme if available, otherwise default
      logThemeFailure(
        'error',
        'db_failure',
        {
          cacheKey,
          themeId,
          error: error?.message,
        },
        'using_cached_or_default'
      )

      // If we have a cached theme, use it
      if (originalTheme) {
        return originalTheme
      }

      // Otherwise, use default
      return getDefaultThemeWithContext(resolutionContext, cacheKey)
    }

    default: {
      // Unknown scenario, use default
      return getDefaultThemeWithContext(resolutionContext, cacheKey)
    }
  }
}

/**
 * Get default theme with context information
 */
function getDefaultThemeWithContext(
  context: ThemeResolutionContext,
  cacheKey?: string
): Theme {
  const defaultTheme = getDefaultSystemTheme()

  // Update cache key if provided
  if (cacheKey) {
    return {
      ...defaultTheme,
      cacheKey,
    }
  }

  return defaultTheme
}

/**
 * Safely get theme config, handling all failure scenarios
 */
export async function safeGetThemeConfig(
  theme: Theme | null,
  context: ThemeResolutionContext
): Promise<ThemeConfig> {
  // If theme is null, use default
  if (!theme) {
    const defaultTheme = getDefaultThemeWithContext(context)
    return defaultTheme.config
  }

  // If config is missing, use default
  if (!theme.config) {
    await handleThemeFailure(
      {
        scenario: 'missing',
        themeId: theme.id,
        cacheKey: theme.cacheKey,
      },
      context
    )
    const defaultTheme = getDefaultThemeWithContext(context, theme.cacheKey)
    return defaultTheme.config
  }

  // Try to validate config
  try {
    return await validateThemeConfigWithContract(theme.config)
  } catch (error) {
    // Validation failed, try to repair
    const repaired = await handleThemeFailure(
      {
        scenario: 'invalid',
        error: error instanceof Error ? error : new Error(String(error)),
        partialConfig: theme.config as Partial<ThemeConfig>,
        themeId: theme.id,
        cacheKey: theme.cacheKey,
        originalTheme: theme,
      },
      context
    )
    return repaired.config
  }
}
