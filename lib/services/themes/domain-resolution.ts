import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCachedTheme } from './cache-strategy'

export interface DomainResolutionResult {
  organizationId: string
  organizationSlug: string
  resolutionMethod: 'subdomain' | 'domain' | 'path' | 'slug'
}

// Cache for domain resolutions (in-memory)
const domainResolutionCache = new Map<string, { result: DomainResolutionResult; expiresAt: number }>()
const DOMAIN_CACHE_TTL = 300000 // 5 minutes

/**
 * Extract subdomain from host
 * Examples:
 * - "tenant1.example.com" → "tenant1"
 * - "www.example.com" → undefined (www is ignored)
 * - "example.com" → undefined
 */
export function extractSubdomain(host: string): string | undefined {
  const parts = host.split('.')
  
  // If less than 3 parts, no subdomain
  if (parts.length < 3) {
    return undefined
  }
  
  // Ignore 'www' subdomain
  if (parts[0] === 'www' && parts.length === 3) {
    return undefined
  }
  
  // Return first part as subdomain
  return parts[0]
}

/**
 * Extract tenant from path
 * Examples:
 * - "/tenant1/events" → "tenant1"
 * - "/tenant1" → "tenant1"
 * - "/events" → undefined
 */
export function extractPathTenant(path: string): string | undefined {
  const pathParts = path.split('/').filter(Boolean)
  
  // First path segment could be tenant
  if (pathParts.length > 0) {
    const firstSegment = pathParts[0]
    // Basic validation: alphanumeric, hyphens, underscores
    if (/^[a-zA-Z0-9_-]+$/.test(firstSegment)) {
      return firstSegment
    }
  }
  
  return undefined
}

/**
 * Resolve organization from subdomain
 */
export async function resolveOrganizationFromSubdomain(
  subdomain: string
): Promise<DomainResolutionResult | null> {
  const cacheKey = `subdomain:${subdomain}`
  const cached = domainResolutionCache.get(cacheKey)
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result
  }

  const supabase = await createServiceRoleClient()

  // Query organizations by slug matching subdomain
  const { data: org } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('slug', subdomain)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (!org) {
    return null
  }

  const result: DomainResolutionResult = {
    organizationId: org.id,
    organizationSlug: org.slug,
    resolutionMethod: 'subdomain',
  }

  domainResolutionCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + DOMAIN_CACHE_TTL,
  })

  return result
}

/**
 * Resolve organization from full domain
 */
export async function resolveOrganizationFromDomain(
  host: string,
  path?: string
): Promise<DomainResolutionResult | null> {
  const cacheKey = `domain:${host}`
  const cached = domainResolutionCache.get(cacheKey)
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result
  }

  const supabase = await createServiceRoleClient()

  // First, try to match by exact domain
  const { data: orgByDomain } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('domain', host)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (orgByDomain) {
    const result: DomainResolutionResult = {
      organizationId: orgByDomain.id,
      organizationSlug: orgByDomain.slug,
      resolutionMethod: 'domain',
    }

    domainResolutionCache.set(cacheKey, {
      result,
      expiresAt: Date.now() + DOMAIN_CACHE_TTL,
    })

    return result
  }

  // If path provided, try path-based resolution
  if (path) {
    const pathResult = await resolveOrganizationFromPath(path)
    if (pathResult) {
      return pathResult
    }
  }

  return null
}

/**
 * Resolve organization from path
 */
export async function resolveOrganizationFromPath(
  path: string
): Promise<DomainResolutionResult | null> {
  const tenant = extractPathTenant(path)
  if (!tenant) {
    return null
  }

  const cacheKey = `path:${tenant}`
  const cached = domainResolutionCache.get(cacheKey)
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result
  }

  const supabase = await createServiceRoleClient()

  // Query organizations by slug from path
  const { data: org } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('slug', tenant)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (!org) {
    return null
  }

  const result: DomainResolutionResult = {
    organizationId: org.id,
    organizationSlug: org.slug,
    resolutionMethod: 'path',
  }

  domainResolutionCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + DOMAIN_CACHE_TTL,
  })

  return result
}

/**
 * Resolve organization from context (tries all methods)
 */
export async function resolveOrganizationFromContext(
  host?: string,
  path?: string
): Promise<DomainResolutionResult | null> {
  // Try subdomain first
  if (host) {
    const subdomain = extractSubdomain(host)
    if (subdomain) {
      const subdomainResult = await resolveOrganizationFromSubdomain(subdomain)
      if (subdomainResult) {
        return subdomainResult
      }
    }

    // Try full domain
    const domainResult = await resolveOrganizationFromDomain(host, path)
    if (domainResult) {
      return domainResult
    }
  }

  // Try path-based
  if (path) {
    const pathResult = await resolveOrganizationFromPath(path)
    if (pathResult) {
      return pathResult
    }
  }

  return null
}

/**
 * Clear domain resolution cache
 */
export function clearDomainResolutionCache(): void {
  domainResolutionCache.clear()
}

/**
 * Invalidate domain resolution cache for an organization
 */
export function invalidateDomainResolutionCache(organizationSlug: string): void {
  for (const [key, value] of domainResolutionCache.entries()) {
    if (value.result.organizationSlug === organizationSlug) {
      domainResolutionCache.delete(key)
    }
  }
}
