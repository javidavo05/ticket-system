import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'

/**
 * Check theme dependencies (events using this theme)
 */
export async function checkThemeDependencies(themeId: string): Promise<{
  hasDependencies: boolean
  events: Array<{ id: string; name: string; slug: string }>
  organizations: Array<{ id: string; name: string }>
}> {
  const supabase = await createServiceRoleClient()

  // Check events using this theme
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, name, slug')
    .eq('theme_id', themeId)
    .is('deleted_at', null)

  if (eventsError) {
    throw new Error(`Failed to check theme dependencies: ${eventsError.message}`)
  }

  // Check organizations with this as default theme
  const { data: organizations, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('default_theme_id', themeId)
    .is('deleted_at', null)

  if (orgsError) {
    throw new Error(`Failed to check organization dependencies: ${orgsError.message}`)
  }

  return {
    hasDependencies: (events && events.length > 0) || (organizations && organizations.length > 0),
    events: events || [],
    organizations: organizations || [],
  }
}

/**
 * Get theme assignments (events and organizations)
 */
export async function getThemeAssignments(themeId: string): Promise<{
  events: Array<{ id: string; name: string; slug: string }>
  organizations: Array<{ id: string; name: string }>
  isDefaultForOrganization?: string
}> {
  const supabase = await createServiceRoleClient()

  // Get events using this theme
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, name, slug')
    .eq('theme_id', themeId)
    .is('deleted_at', null)

  if (eventsError) {
    throw new Error(`Failed to get theme event assignments: ${eventsError.message}`)
  }

  // Get theme to check if it's a default theme
  const { data: theme, error: themeError } = await (supabase
    .from('themes')
    .select('organization_id, is_default')
    .eq('id', themeId)
    .single() as any)

  if (themeError || !theme) {
    throw new NotFoundError('Theme')
  }

  // Get organization if this is a default theme
  let organizations: Array<{ id: string; name: string }> = []
  const themeData = theme as any
  if (themeData.is_default && themeData.organization_id) {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', themeData.organization_id)
      .is('deleted_at', null)
      .single()

    if (!orgError && org) {
      organizations = [org]
    }
  }

  return {
    events: events || [],
    organizations,
    isDefaultForOrganization: themeData.is_default && themeData.organization_id ? themeData.organization_id : undefined,
  }
}

/**
 * Check if theme can be deleted
 */
export async function canDeleteTheme(themeId: string): Promise<{
  canDelete: boolean
  reasons: string[]
}> {
  const dependencies = await checkThemeDependencies(themeId)
  const reasons: string[] = []

  if (dependencies.events.length > 0) {
    reasons.push(`Theme is assigned to ${dependencies.events.length} event(s)`)
  }

  if (dependencies.organizations.length > 0) {
    reasons.push(`Theme is default for ${dependencies.organizations.length} organization(s)`)
  }

  return {
    canDelete: !dependencies.hasDependencies,
    reasons,
  }
}

/**
 * Validate theme exists
 */
export async function validateThemeExists(themeId: string): Promise<void> {
  const supabase = await createServiceRoleClient()

  const { data: theme, error } = await supabase
    .from('themes')
    .select('id')
    .eq('id', themeId)
    .single()

  if (error || !theme) {
    throw new NotFoundError('Theme')
  }
}

/**
 * Validate event exists
 */
export async function validateEventExists(eventId: string): Promise<void> {
  const supabase = await createServiceRoleClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .is('deleted_at', null)
    .single()

  if (error || !event) {
    throw new NotFoundError('Event')
  }
}

/**
 * Validate organization exists
 */
export async function validateOrganizationExists(organizationId: string): Promise<void> {
  const supabase = await createServiceRoleClient()

  const { data: organization, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .is('deleted_at', null)
    .single()

  if (error || !organization) {
    throw new NotFoundError('Organization')
  }
}
