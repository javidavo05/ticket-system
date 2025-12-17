import type { NextRequest } from 'next/server'
import { assertServerSide } from './security'
import { extractThemeContext } from './request-context'
import { resolveOrganizationFromContext } from './domain-resolution'
import { resolveTheme, getThemeBySlug, getDefaultTheme } from './resolution'
import { validateThemeConfig, validateThemeConfigWithContract } from './validation'
import { sanitizeThemeConfig } from './sanitization'
import { getCachedThemeByContext } from './cache-strategy'
import type {
  Theme,
  ThemeResolutionContext,
  ResolvedTheme,
} from './domain'
import { generateThemeCacheTags } from './domain'
import { handleThemeFailure, safeGetThemeConfig } from './failure-handler'
import { isPartialConfig, mergePartialConfig } from './partial-config'
import { logThemeFailure, logThemePerformance } from './theme-logger'
import { trackThemeFailure } from './performance'
import { withCircuitBreaker } from './circuit-breaker'

/**
 * Resolve theme from Next.js request
 * Main entry point for server-side theme resolution
 */
export async function resolveThemeFromRequest(
  request: NextRequest
): Promise<ResolvedTheme> {
  assertServerSide()

  // Extract context from request
  const context = extractThemeContext(request)

  // Resolve theme from context
  return resolveThemeFromContext(context)
}

/**
 * Resolve theme from context
 * Applies full resolution chain with validation and sanitization
 * Never throws - always returns a valid theme
 */
export async function resolveThemeFromContext(
  context: ThemeResolutionContext
): Promise<ResolvedTheme> {
  assertServerSide()

  const startTime = Date.now()

  try {
    // Step 1: Resolve organization from domain/subdomain/path if needed
    if (!context.organizationId && (context.host || context.path)) {
      try {
        const domainResult = await withCircuitBreaker(() =>
          resolveOrganizationFromContext(context.host, context.path)
        )

        if (domainResult) {
          context.organizationId = domainResult.organizationId
          context.domain = context.host
          context.subdomain = context.subdomain || domainResult.organizationSlug
        }
      } catch (error) {
        logThemeFailure('warn', 'domain_resolution_failed', {
          host: context.host,
          path: context.path,
          error: error instanceof Error ? error.message : String(error),
        })
        // Continue without domain resolution
      }
    }

    // Step 2: Resolve theme using cached resolution with fail-safe
    let resolution: Theme
    try {
      resolution = await getCachedThemeByContext(
        context,
        async () => {
          try {
            // Try event slug first if available
            if (context.slug && !context.eventId) {
              const slugResolution = await withCircuitBreaker(() =>
                getThemeBySlug(context.slug!)
              )
              return slugResolution.theme
            }

            // Use standard resolution
            const standardResolution = await withCircuitBreaker(() =>
              resolveTheme(context)
            )
            return standardResolution.theme
          } catch (error) {
            // DB failure - use failure handler
            trackThemeFailure()
            return handleThemeFailure(
              {
                scenario: 'db_failure',
                error: error instanceof Error ? error : new Error(String(error)),
                cacheKey: context.eventId || context.organizationId || 'default',
              },
              context
            )
          }
        }
      )
    } catch (error) {
      // Cache failure - use failure handler
      trackThemeFailure()
      resolution = await handleThemeFailure(
        {
          scenario: 'cache_failure',
          error: error instanceof Error ? error : new Error(String(error)),
          cacheKey: context.eventId || context.organizationId || 'default',
        },
        context
      )
    }

    // Step 3: Validate and handle theme config (with partial support)
    let validatedConfig = resolution.config

    // Check if config is missing
    if (!validatedConfig) {
      trackThemeFailure()
      const recovered = await handleThemeFailure(
        {
          scenario: 'missing',
          themeId: resolution.id,
          cacheKey: resolution.cacheKey,
          originalTheme: resolution,
        },
        context
      )
      resolution = recovered
      validatedConfig = recovered.config
    }

    // Check if config is partial
    if (isPartialConfig(validatedConfig)) {
      logThemeFailure('warn', 'partial_config_detected', {
        themeId: resolution.id,
        cacheKey: resolution.cacheKey,
      }, 'merging_with_defaults')

      try {
        validatedConfig = mergePartialConfig(validatedConfig)
        const validated = await validateThemeConfigWithContract(validatedConfig)
        resolution = {
          ...resolution,
          config: validated,
        }
      } catch (error) {
        // Merge/validation failed, use failure handler
        trackThemeFailure()
        const recovered = await handleThemeFailure(
          {
            scenario: 'partial',
            error: error instanceof Error ? error : new Error(String(error)),
            partialConfig: validatedConfig,
            themeId: resolution.id,
            cacheKey: resolution.cacheKey,
            originalTheme: resolution,
          },
          context
        )
        resolution = recovered
        validatedConfig = recovered.config
      }
    } else {
      // Config exists, validate it
      try {
        validatedConfig = await validateThemeConfigWithContract(validatedConfig)
        resolution = {
          ...resolution,
          config: validatedConfig,
        }
      } catch (error) {
        // Validation failed, try to repair
        trackThemeFailure()
        const recovered = await handleThemeFailure(
          {
            scenario: 'invalid',
            error: error instanceof Error ? error : new Error(String(error)),
            partialConfig: validatedConfig,
            themeId: resolution.id,
            cacheKey: resolution.cacheKey,
            originalTheme: resolution,
          },
          context
        )
        resolution = recovered
        validatedConfig = recovered.config
      }
    }

    // Step 4: Determine source
    let source: ResolvedTheme['source'] = 'default'
    if (context.domain || context.subdomain) {
      source = 'domain'
    } else if (context.eventId) {
      source = 'event'
    } else if (context.organizationId) {
      source = 'organization'
    }

    // Step 5: Generate cache key and tags
    const cacheKey = resolution.cacheKey
    const cacheTags = generateThemeCacheTags(resolution)

    const duration = Date.now() - startTime
    logThemePerformance('resolve_theme', duration, true, {
      source,
      cacheKey,
      themeId: resolution.id,
    })

    return {
      theme: resolution,
      source,
      cacheKey,
      cacheTags,
      resolvedAt: new Date(),
    }
  } catch (error) {
    // Ultimate fallback - should never reach here, but ensure we always return a theme
    trackThemeFailure()
    logThemeFailure('error', 'unexpected_resolution_error', {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    }, 'using_default_theme')

    const defaultTheme = await getDefaultTheme()
    const duration = Date.now() - startTime
    logThemePerformance('resolve_theme', duration, false, {
      source: 'default',
      cacheKey: 'default',
    })

    return {
      theme: defaultTheme,
      source: 'default',
      cacheKey: defaultTheme.cacheKey,
      cacheTags: generateThemeCacheTags(defaultTheme),
      resolvedAt: new Date(),
    }
  }
}

/**
 * Resolve and sanitize theme from request
 * Returns sanitized theme config for safe client-side use
 * Never throws - always returns valid theme
 */
export async function resolveAndSanitizeThemeFromRequest(
  request: NextRequest
): Promise<ResolvedTheme & { sanitizedConfig: ReturnType<typeof sanitizeThemeConfig> }> {
  try {
    const resolved = await resolveThemeFromRequest(request)

    // Sanitize config for security
    const sanitizedConfig = sanitizeThemeConfig(resolved.theme.config)

    return {
      ...resolved,
      sanitizedConfig,
    }
  } catch (error) {
    // Ultimate fallback - should never reach here
    logThemeFailure('error', 'sanitization_failed', {
      error: error instanceof Error ? error.message : String(error),
    }, 'using_default_theme')

    const defaultTheme = await getDefaultTheme()
    const sanitizedConfig = sanitizeThemeConfig(defaultTheme.config)

    return {
      theme: defaultTheme,
      source: 'default',
      cacheKey: defaultTheme.cacheKey,
      cacheTags: generateThemeCacheTags(defaultTheme),
      resolvedAt: new Date(),
      sanitizedConfig,
    }
  }
}

/**
 * Resolve and sanitize theme from context
 * Never throws - always returns valid theme
 */
export async function resolveAndSanitizeThemeFromContext(
  context: ThemeResolutionContext
): Promise<ResolvedTheme & { sanitizedConfig: ReturnType<typeof sanitizeThemeConfig> }> {
  try {
    const resolved = await resolveThemeFromContext(context)

    // Sanitize config for security
    const sanitizedConfig = sanitizeThemeConfig(resolved.theme.config)

    return {
      ...resolved,
      sanitizedConfig,
    }
  } catch (error) {
    // Ultimate fallback - should never reach here
    logThemeFailure('error', 'sanitization_failed', {
      error: error instanceof Error ? error.message : String(error),
    }, 'using_default_theme')

    const defaultTheme = await getDefaultTheme()
    const sanitizedConfig = sanitizeThemeConfig(defaultTheme.config)

    return {
      theme: defaultTheme,
      source: 'default',
      cacheKey: defaultTheme.cacheKey,
      cacheTags: generateThemeCacheTags(defaultTheme),
      resolvedAt: new Date(),
      sanitizedConfig,
    }
  }
}
