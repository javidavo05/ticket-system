import { z } from 'zod'
import { themeConfigSchema } from '@/lib/services/themes/validation'

/**
 * Schema for creating a new theme
 */
export const createThemeSchema = z.object({
  name: z.string().min(1).max(200),
  config: themeConfigSchema,
  organizationId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  parentThemeId: z.string().uuid().optional(),
  schemaVersion: z.string().optional().default('1.0.0'),
}).refine(
  (data) => !(data.eventId && data.organizationId),
  {
    message: 'Theme cannot be assigned to both event and organization',
    path: ['eventId'],
  }
).refine(
  (data) => !data.isDefault || data.organizationId,
  {
    message: 'Default themes must be assigned to an organization',
    path: ['isDefault'],
  }
)

/**
 * Schema for updating a theme
 */
export const updateThemeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  config: themeConfigSchema.optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  schemaVersion: z.string().optional(),
}).refine(
  (data) => !data.isDefault || !data.config,
  {
    message: 'Cannot change isDefault when updating config - use assignThemeToOrganization instead',
    path: ['isDefault'],
  }
)

/**
 * Schema for assigning theme to event
 */
export const assignThemeToEventSchema = z.object({
  themeId: z.string().uuid(),
  eventId: z.string().uuid(),
})

/**
 * Schema for assigning theme to organization
 */
export const assignThemeToOrganizationSchema = z.object({
  themeId: z.string().uuid(),
  organizationId: z.string().uuid(),
})

/**
 * Schema for theme version operations
 */
export const themeVersionSchema = z.object({
  themeId: z.string().uuid(),
  version: z.number().int().min(1),
})

/**
 * Schema for listing themes with filters
 */
export const listThemesSchema = z.object({
  organizationId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
})
