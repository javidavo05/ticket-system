'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { assignThemeToOrganizationSchema } from '@/lib/services/admin/themes/validation'
import { invalidateOrganizationTheme } from '@/lib/services/themes/cache-strategy'
import {
  validateThemeExists,
  validateOrganizationExists,
} from '@/lib/services/admin/themes/helpers'

export async function assignThemeToOrganization(themeId: string, organizationId: string) {
  const user = await requireSuperAdmin()

  // Validate input
  const validated = assignThemeToOrganizationSchema.parse({ themeId, organizationId })

  // Validate theme exists and is active
  await validateThemeExists(validated.themeId)

  // Validate organization exists
  await validateOrganizationExists(validated.organizationId)

  const supabase = await createServiceRoleClient()

  // Check theme is active
  const { data: themeData, error: themeError } = await supabase
    .from('themes')
    .select('id, name, is_active, organization_id, is_default')
    .eq('id', validated.themeId)
    .single()

  if (themeError || !themeData) {
    throw new NotFoundError('Theme')
  }

  const theme = themeData as {
    id: string
    name: string
    is_active: boolean
    organization_id: string | null
    is_default: boolean
  }

  if (!theme.is_active) {
    throw new Error('Cannot assign inactive theme as default for organization')
  }

  // Get organization info for audit
  const { data: organizationData, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, default_theme_id')
    .eq('id', validated.organizationId)
    .single()

  if (orgError || !organizationData) {
    throw new NotFoundError('Organization')
  }

  const organization = organizationData as {
    id: string
    name: string
    default_theme_id: string | null
  }

  // Check if another theme is already default for this organization
  const { data: existingDefaultData, error: existingError } = await supabase
    .from('themes')
    .select('id, name')
    .eq('organization_id', validated.organizationId)
    .eq('is_default', true)
    .neq('id', validated.themeId)
    .is('deprecated_at', null)
    .single()

  const existingDefault = existingDefaultData as { id: string; name: string } | null

  if (existingDefault) {
    // Unset previous default
    await ((supabase as any)
      .from('themes')
      .update({
        is_default: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingDefault.id))
  }

  // Update theme to be default for organization
  const { error: updateError } = await ((supabase as any)
    .from('themes')
    .update({
      organization_id: validated.organizationId,
      is_default: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.themeId))

  if (updateError) {
    throw new Error(`Failed to assign theme to organization: ${updateError.message}`)
  }

  // Invalidate organization theme cache
  await invalidateOrganizationTheme(validated.organizationId)

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'theme_assigned_to_organization',
      resourceType: 'theme',
      resourceId: validated.themeId,
      metadata: {
        themeName: theme.name,
        organizationId: validated.organizationId,
        organizationName: organization.name,
        previousDefaultThemeId: existingDefault?.id || organization.default_theme_id || null,
      },
    },
    request as any
  )

  return {
    success: true,
    themeId: validated.themeId,
    organizationId: validated.organizationId,
  }
}
