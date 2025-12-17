import type { NextRequest } from 'next/server'
import type { ThemeResolutionContext } from './domain'
import { extractSubdomain, extractPathTenant } from './domain-resolution'

/**
 * Extract event ID from URL
 * Supports:
 * - Query parameter: ?eventId=xxx
 * - Path parameter: /events/[eventId]
 * - Path slug: /events/[slug] (will need to resolve to eventId)
 */
function extractEventId(url: URL): string | undefined {
  // Try query parameter first
  const eventIdParam = url.searchParams.get('eventId')
  if (eventIdParam && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventIdParam)) {
    return eventIdParam
  }

  // Try path pattern: /events/[eventId] or /events/[slug]
  const pathMatch = url.pathname.match(/^\/events\/([^/]+)/)
  if (pathMatch) {
    const eventIdentifier = pathMatch[1]
    // Check if it's a UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventIdentifier)) {
      return eventIdentifier
    }
    // Otherwise, it's a slug - will need to be resolved later
    return undefined
  }

  return undefined
}

/**
 * Extract event slug from URL
 */
function extractEventSlug(url: URL): string | undefined {
  const pathMatch = url.pathname.match(/^\/events\/([^/]+)/)
  if (pathMatch) {
    const slug = pathMatch[1]
    // Validate slug format (alphanumeric, hyphens, underscores)
    if (/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return slug
    }
  }
  return undefined
}

/**
 * Extract organization ID from query parameters
 */
function extractOrganizationId(url: URL): string | undefined {
  const orgIdParam = url.searchParams.get('organizationId')
  if (orgIdParam && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgIdParam)) {
    return orgIdParam
  }
  return undefined
}

/**
 * Extract theme resolution context from Next.js request
 */
export function extractThemeContext(request: NextRequest): ThemeResolutionContext {
  const url = new URL(request.url)
  const host = request.headers.get('host') || url.hostname
  
  // Extract subdomain
  const subdomain = extractSubdomain(host)
  
  // Extract path-based tenant
  const pathTenant = extractPathTenant(url.pathname)
  
  // Extract event ID from query params or path
  const eventId = extractEventId(url)
  
  // Extract event slug
  const slug = extractEventSlug(url)
  
  // Extract organization ID from query params
  const organizationId = extractOrganizationId(url)
  
  return {
    host,
    domain: host,
    subdomain,
    path: pathTenant,
    eventId,
    slug,
    organizationId,
  }
}

/**
 * Extract theme context from URL string (for testing or non-request scenarios)
 */
export function extractThemeContextFromURL(urlString: string, host?: string): ThemeResolutionContext {
  const url = new URL(urlString)
  const effectiveHost = host || url.hostname
  
  const subdomain = extractSubdomain(effectiveHost)
  const pathTenant = extractPathTenant(url.pathname)
  const eventId = extractEventId(url)
  const slug = extractEventSlug(url)
  const organizationId = extractOrganizationId(url)
  
  return {
    host: effectiveHost,
    domain: effectiveHost,
    subdomain,
    path: pathTenant,
    eventId,
    slug,
    organizationId,
  }
}
