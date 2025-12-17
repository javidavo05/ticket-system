import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'
import { isSuperAdmin } from '@/lib/supabase/rls'
import {
  invalidateThemeCache,
  invalidateEventTheme,
  invalidateOrganizationTheme,
  invalidateTheme,
} from '@/lib/services/themes/cache-strategy'
import { z } from 'zod'

const invalidateSchema = z.object({
  tags: z.array(z.string()).optional(),
  eventId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  themeId: z.string().uuid().optional(),
  version: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Check if user is super admin
    const userIsAdmin = await isSuperAdmin(user.id)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - super admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = invalidateSchema.parse(body)

    // Invalidate based on provided parameters
    if (validated.tags && validated.tags.length > 0) {
      await invalidateThemeCache(validated.tags)
      return NextResponse.json({
        success: true,
        message: `Invalidated cache for tags: ${validated.tags.join(', ')}`,
      })
    }

    if (validated.eventId) {
      await invalidateEventTheme(validated.eventId)
      return NextResponse.json({
        success: true,
        message: `Invalidated cache for event: ${validated.eventId}`,
      })
    }

    if (validated.organizationId) {
      await invalidateOrganizationTheme(validated.organizationId)
      return NextResponse.json({
        success: true,
        message: `Invalidated cache for organization: ${validated.organizationId}`,
      })
    }

    if (validated.themeId) {
      await invalidateTheme(validated.themeId, validated.version)
      return NextResponse.json({
        success: true,
        message: `Invalidated cache for theme: ${validated.themeId}${validated.version ? `:v${validated.version}` : ''}`,
      })
    }

    return NextResponse.json(
      { error: 'No invalidation parameters provided' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Theme cache invalidation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to invalidate theme cache' },
      { status: 500 }
    )
  }
}
