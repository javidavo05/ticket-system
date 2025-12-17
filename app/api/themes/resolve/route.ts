import { NextRequest, NextResponse } from 'next/server'
import { resolveAndSanitizeThemeFromRequest } from '@/lib/services/themes/resolver'
import { getThemeSecurityHeaders } from '@/lib/services/themes/security'

export async function GET(request: NextRequest) {
  try {
    // Resolve and sanitize theme from request
    // This ensures:
    // 1. Server-side only resolution
    // 2. Domain/subdomain/path-based resolution
    // 3. Validation of theme config
    // 4. Sanitization for security (XSS, CSS injection prevention)
    const result = await resolveAndSanitizeThemeFromRequest(request)

    // Generate ETag from cache key
    const etag = `"${result.cacheKey}"`

    // Check If-None-Match header for cache validation
    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          ETag: etag,
          'Cache-Tags': result.cacheTags.join(','),
          ...getThemeSecurityHeaders(),
        },
      })
    }

    // Return only sanitized theme config (never raw config)
    // This prevents theme-based injection attacks
    return NextResponse.json(
      {
        theme: {
          id: result.theme.id,
          name: result.theme.name,
          version: result.theme.version,
          config: result.sanitizedConfig, // Only sanitized config
        },
        source: result.source,
        cacheKey: result.cacheKey,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          ETag: etag,
          'Cache-Tags': result.cacheTags.join(','),
          ...getThemeSecurityHeaders(),
        },
      }
    )
  } catch (error) {
    console.error('Theme resolution error:', error)
    
    // Return generic error (don't expose internal details)
    return NextResponse.json(
      { error: 'Failed to resolve theme' },
      {
        status: 500,
        headers: getThemeSecurityHeaders(),
      }
    )
  }
}
