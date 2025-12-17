import { ThemeConfig } from './loader'

/**
 * Theme domain model
 * Represents a theme with all its metadata and configuration
 */
export interface Theme {
  id: string
  name: string
  version: number
  versionHash: string
  organizationId?: string
  eventId?: string
  isDefault: boolean
  isActive: boolean
  config: ThemeConfig
  parentThemeId?: string
  cacheKey: string
  publishedAt?: Date
  deprecatedAt?: Date
  createdAt: Date
  updatedAt: Date
  createdBy?: string
}

/**
 * Context for theme resolution
 * Contains information needed to resolve the appropriate theme
 */
export interface ThemeResolutionContext {
  eventId?: string
  organizationId?: string
  slug?: string
  // Domain-based resolution fields
  domain?: string        // Full domain (e.g., "tenant1.example.com")
  subdomain?: string    // Extracted subdomain (e.g., "tenant1")
  host?: string         // Full host from request
  path?: string         // Path-based tenant (e.g., "/tenant1")
}

/**
 * Result of theme resolution
 * Contains the resolved theme and metadata about how it was resolved
 */
export interface ThemeResolutionResult {
  theme: Theme
  source: 'domain' | 'event' | 'organization' | 'default'
  cacheKey: string
  cacheTags: string[]
}

/**
 * Enhanced resolved theme with additional metadata
 */
export interface ResolvedTheme {
  theme: Theme
  source: 'domain' | 'event' | 'organization' | 'default'
  cacheKey: string
  cacheTags: string[]
  resolvedAt: Date
}

/**
 * Theme version history entry
 */
export interface ThemeVersion {
  id: string
  themeId: string
  version: number
  config: ThemeConfig
  versionHash: string
  createdBy?: string
  createdAt: Date
}

/**
 * Cache tag for theme invalidation
 */
export interface ThemeCacheTag {
  id: string
  themeId: string
  tag: string
  createdAt: Date
}

/**
 * Generate cache key for a theme
 */
export function generateThemeCacheKey(themeId: string, version: number): string {
  return `theme:${themeId}:v${version}`
}

/**
 * Generate cache tags for a theme
 */
export function generateThemeCacheTags(theme: Theme): string[] {
  const tags: string[] = [
    `theme:${theme.id}`,
    `theme:${theme.id}:v${theme.version}`,
  ]

  if (theme.eventId) {
    tags.push(`event:${theme.eventId}`)
  }

  if (theme.organizationId) {
    tags.push(`org:${theme.organizationId}`)
    if (theme.isDefault) {
      tags.push(`org:${theme.organizationId}:default`)
    }
  }

  return tags
}

/**
 * Generate cache tags from resolution context
 */
export function generateCacheTagsFromContext(context: ThemeResolutionContext): string[] {
  const tags: string[] = []

  if (context.eventId) {
    tags.push(`event:${context.eventId}`)
  }

  if (context.organizationId) {
    tags.push(`org:${context.organizationId}`)
    tags.push(`org:${context.organizationId}:default`)
  }

  if (context.domain) {
    tags.push(`domain:${context.domain}`)
  }

  if (context.subdomain) {
    tags.push(`subdomain:${context.subdomain}`)
  }

  return tags
}
