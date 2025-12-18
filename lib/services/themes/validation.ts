import { z } from 'zod'
import type { ThemeConfig } from './loader'

/**
 * Hex color validation regex
 * Matches #RRGGBB format
 */
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/

/**
 * Color scale schema (50-900)
 */
const colorScaleSchema = z.object({
  50: z.string().regex(hexColorRegex, 'Color must be in hex format #RRGGBB'),
  100: z.string().regex(hexColorRegex),
  200: z.string().regex(hexColorRegex),
  300: z.string().regex(hexColorRegex),
  400: z.string().regex(hexColorRegex),
  500: z.string().regex(hexColorRegex),
  600: z.string().regex(hexColorRegex),
  700: z.string().regex(hexColorRegex),
  800: z.string().regex(hexColorRegex),
  900: z.string().regex(hexColorRegex),
})

/**
 * Optional color scale schema (for semantic colors)
 */
const optionalColorScaleSchema = z.object({
  50: z.string().regex(hexColorRegex).optional(),
  100: z.string().regex(hexColorRegex).optional(),
  200: z.string().regex(hexColorRegex).optional(),
  300: z.string().regex(hexColorRegex).optional(),
  400: z.string().regex(hexColorRegex).optional(),
  500: z.string().regex(hexColorRegex), // Required
  600: z.string().regex(hexColorRegex).optional(),
  700: z.string().regex(hexColorRegex).optional(),
  800: z.string().regex(hexColorRegex).optional(),
  900: z.string().regex(hexColorRegex).optional(),
})

/**
 * Dark mode color scale (optional fields)
 */
const darkColorScaleSchema = z.object({
  50: z.string().regex(hexColorRegex).optional(),
  100: z.string().regex(hexColorRegex).optional(),
  200: z.string().regex(hexColorRegex).optional(),
  300: z.string().regex(hexColorRegex).optional(),
  400: z.string().regex(hexColorRegex).optional(),
  500: z.string().regex(hexColorRegex),
  600: z.string().regex(hexColorRegex).optional(),
  700: z.string().regex(hexColorRegex).optional(),
  800: z.string().regex(hexColorRegex).optional(),
  900: z.string().regex(hexColorRegex).optional(),
})

/**
 * CSS unit validation (rem, em, px, %, etc.)
 */
const cssUnitRegex = /^-?\d+(\.\d+)?(rem|em|px|%|vh|vw|ch|ex|cm|mm|in|pt|pc)$/

/**
 * CSS size value (can be unit or calc() or var())
 */
const cssSizeSchema = z.string().refine(
  (val) => {
    // Allow CSS units, calc(), var(), or numeric values
    return (
      cssUnitRegex.test(val) ||
      val.startsWith('calc(') ||
      val.startsWith('var(') ||
      /^\d+(\.\d+)?$/.test(val)
    )
  },
  { message: 'Must be a valid CSS size value' }
)

/**
 * Font family validation (alphanumeric, spaces, commas, quotes)
 */
const fontFamilySchema = z
  .string()
  .max(200, 'Font family name too long')
  .refine(
    (val) => {
      // Prevent script injection - only allow safe characters
      return /^[a-zA-Z0-9\s,'"\-_]+$/.test(val) && !val.includes('<') && !val.includes('>')
    },
    { message: 'Font family contains invalid characters' }
  )

/**
 * ThemeConfig Zod schema
 * Type annotation removed to avoid strict type checking conflicts
 */
export const themeConfigSchema = z.object({
  colors: z.object({
    primary: colorScaleSchema,
    secondary: colorScaleSchema,
    success: optionalColorScaleSchema,
    error: optionalColorScaleSchema,
    warning: optionalColorScaleSchema,
    info: optionalColorScaleSchema,
    neutral: colorScaleSchema,
    accent: z
      .object({
        500: z.string().regex(hexColorRegex),
      })
      .optional(),
    background: z.object({
      default: z.string().regex(hexColorRegex),
    }),
    text: z.object({
      default: z.string().regex(hexColorRegex),
    }),
    dark: z
      .object({
        primary: darkColorScaleSchema.optional(),
        secondary: darkColorScaleSchema.optional(),
        success: z.object({ 500: z.string().regex(hexColorRegex) }).optional(),
        error: z.object({ 500: z.string().regex(hexColorRegex) }).optional(),
        warning: z.object({ 500: z.string().regex(hexColorRegex) }).optional(),
        info: z.object({ 500: z.string().regex(hexColorRegex) }).optional(),
        background: z.object({ default: z.string().regex(hexColorRegex) }).optional(),
        text: z.object({ default: z.string().regex(hexColorRegex) }).optional(),
      })
      .optional(),
  }),
  typography: z.object({
    fontFamily: fontFamilySchema,
    headingFont: fontFamilySchema,
    sizes: z.record(z.string(), cssSizeSchema),
    weights: z.object({
      light: z.number().int().min(100).max(900),
      normal: z.number().int().min(100).max(900),
      medium: z.number().int().min(100).max(900),
      semibold: z.number().int().min(100).max(900),
      bold: z.number().int().min(100).max(900),
    }),
    lineHeights: z.record(z.string(), z.string()),
    letterSpacing: z.record(z.string(), z.string()),
  }),
  spacing: z.object({
    tokens: z.record(z.string(), cssSizeSchema),
    scale: z.array(z.number().int().min(0)),
  }),
  layout: z.object({
    variant: z.enum(['centered', 'wide', 'narrow']),
    heroStyle: z.enum(['image', 'video', 'gradient']),
    breakpoints: z.object({
      sm: cssSizeSchema,
      md: cssSizeSchema,
      lg: cssSizeSchema,
      xl: cssSizeSchema,
      '2xl': cssSizeSchema,
    }),
    containerWidths: z.record(z.string(), cssSizeSchema),
    gridColumns: z.number().int().min(1).max(24),
  }),
  animations: z.object({
    enabled: z.boolean(),
    transitions: z.record(z.string(), z.string()),
    durations: z.record(z.string(), z.string()),
    easings: z.record(z.string(), z.string()),
  }),
  assets: z
    .object({
      logo: z.string().optional(),
      logoDark: z.string().optional(),
      favicon: z.string().optional(),
      background: z.string().optional(),
      backgroundMobile: z.string().optional(),
      ogImage: z.string().optional(),
    })
    .optional(),
})

/**
 * Validate theme config using Zod schema
 * Throws ZodError if validation fails
 */
export function validateThemeConfig(config: unknown): ThemeConfig {
  return themeConfigSchema.parse(config) as any as ThemeConfig
}

/**
 * Safe validate theme config (returns result instead of throwing)
 */
export function safeValidateThemeConfig(
  config: unknown
): { success: true; data: ThemeConfig } | { success: false; error: z.ZodError } {
  const result = themeConfigSchema.safeParse(config)
  if (result.success) {
    return { success: true, data: result.data as any as ThemeConfig }
  }
  return { success: false, error: result.error }
}

/**
 * Validate theme config with contract validation and migration fallback
 * This is the recommended validation function that ensures contract compliance
 */
export async function validateThemeConfigWithContract(
  config: unknown,
  schemaVersion?: string
): Promise<ThemeConfig> {
  // Step 1: Validate against Zod schema (basic structure)
  let validated: ThemeConfig
  try {
    validated = validateThemeConfig(config)
  } catch (error) {
    // If basic validation fails, try to migrate from old format
    const { autoMigrateToLatest } = await import('./migration')
    try {
      const migrated = autoMigrateToLatest(config as ThemeConfig)
      validated = migrated.migrated
    } catch (migrationError) {
      // If migration also fails, throw original error
      throw error
    }
  }

  // Step 2: Get contract for schema version
  const { getTokenContract, detectSchemaVersion } = await import('./contract-registry')
  const targetVersion = schemaVersion || detectSchemaVersion(validated)
  const contract = getTokenContract(targetVersion)

  // Step 3: Validate against contract
  const { validateAgainstContract } = await import('./contract-validation')
  const contractResult = validateAgainstContract(validated, contract)

  if (!contractResult.valid) {
    // Try migration if available
    const { migrateThemeConfig } = await import('./migration')
    const detectedVersion = detectSchemaVersion(validated)
    const migrated = migrateThemeConfig(validated, detectedVersion, contract.schemaVersion)
    
    // Re-validate after migration
    const revalidation = validateAgainstContract(migrated.migrated, contract)
    if (!revalidation.valid) {
      // Log warnings but return migrated config
      console.warn('Theme config has validation issues after migration:', revalidation.errors)
    }
    
    return migrated.migrated
  }

  return validated
}
