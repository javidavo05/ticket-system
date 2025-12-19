'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { listThemesSchema } from '@/lib/services/admin/themes/validation'
import type { ThemeConfig } from '@/lib/services/themes/loader'

export async function listThemes(filters?: {
  organizationId?: string
  eventId?: string
  isActive?: boolean
  isDefault?: boolean
  limit?: number
  offset?: number
}) {
  await requireSuperAdmin()

  // Validate filters
  const validated = listThemesSchema.parse(filters || {})

  const supabase = await createServiceRoleClient()

  // Build query
  let query = supabase
    .from('themes')
    .select(`
      id,
      name,
      version,
      organization_id,
      event_id,
      is_default,
      is_active,
      schema_version,
      published_at,
      deprecated_at,
      created_at,
      updated_at
    `)

  // Apply filters
  if (validated.organizationId) {
    query = query.eq('organization_id', validated.organizationId)
  }

  if (validated.eventId) {
    query = query.eq('event_id', validated.eventId)
  }

  if (validated.isActive !== undefined) {
    query = query.eq('is_active', validated.isActive)
  }

  if (validated.isDefault !== undefined) {
    query = query.eq('is_default', validated.isDefault)
  }

  // Only show non-deprecated themes
  query = query.is('deprecated_at', null)

  // Apply pagination
  query = query
    .order('created_at', { ascending: false })
    .range(validated.offset, validated.offset + validated.limit - 1)

  const { data: themesData, error } = await query

  if (error) {
    throw new Error(`Failed to list themes: ${error.message}`)
  }

  const themes = (themesData || []) as Array<{
    id: string
    name: string
    version: number
    organization_id: string | null
    event_id: string | null
    is_default: boolean
    is_active: boolean
    [key: string]: any
  }>

  return themes.map((theme) => ({
    id: theme.id,
    name: theme.name,
    version: theme.version as number,
    organizationId: theme.organization_id || undefined,
    eventId: theme.event_id || undefined,
    isDefault: theme.is_default || false,
    isActive: theme.is_active !== false,
    schemaVersion: (theme.schema_version as string) || '1.0.0',
    publishedAt: theme.published_at ? new Date(theme.published_at) : undefined,
    createdAt: new Date(theme.created_at),
    updatedAt: new Date(theme.updated_at),
  }))
}
