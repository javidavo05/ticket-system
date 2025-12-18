import type { ThemeConfig } from './loader'
import { defaultThemeConfig } from '@/config/theme-defaults'
import { getTokenContract } from './contract-registry'

/**
 * Deep merge two objects, with defaults taking precedence for missing values
 */
function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target }

  for (const key in source) {
    if (source[key] === null || source[key] === undefined) {
      continue
    }

    if (
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] || {}, source[key] || {}) as any
    } else {
      result[key] = source[key] as any
    }
  }

  return result
}

/**
 * Merge partial theme config with defaults
 * Intelligently fills missing required tokens
 */
export function mergePartialConfig(
  partial: Partial<ThemeConfig>,
  defaults: ThemeConfig = defaultThemeConfig
): ThemeConfig {
  // Deep merge partial config into defaults
  const merged = deepMerge(defaults, partial)

  // Ensure all required color scales are present
  if (!merged.colors.primary) {
    merged.colors.primary = defaults.colors.primary
  } else {
    // Fill missing shades in primary scale
    for (const shade of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const) {
      if (!merged.colors.primary[shade]) {
        merged.colors.primary[shade] = defaults.colors.primary[shade]
      }
    }
  }

  if (!merged.colors.secondary) {
    merged.colors.secondary = defaults.colors.secondary
  } else {
    // Fill missing shades in secondary scale
    for (const shade of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const) {
      if (!merged.colors.secondary[shade]) {
        merged.colors.secondary[shade] = defaults.colors.secondary[shade]
      }
    }
  }

  if (!merged.colors.neutral) {
    merged.colors.neutral = defaults.colors.neutral
  } else {
    // Fill missing shades in neutral scale
    for (const shade of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const) {
      if (!merged.colors.neutral[shade]) {
        merged.colors.neutral[shade] = defaults.colors.neutral[shade]
      }
    }
  }

  // Ensure required semantic colors
  if (!merged.colors.success?.[500]) {
    merged.colors.success = { ...defaults.colors.success, ...merged.colors.success }
  }
  if (!merged.colors.error?.[500]) {
    merged.colors.error = { ...defaults.colors.error, ...merged.colors.error }
  }
  if (!merged.colors.warning?.[500]) {
    merged.colors.warning = { ...defaults.colors.warning, ...merged.colors.warning }
  }
  if (!merged.colors.info?.[500]) {
    merged.colors.info = { ...defaults.colors.info, ...merged.colors.info }
  }

  // Ensure required background and text
  if (!merged.colors.background?.default) {
    merged.colors.background = { default: defaults.colors.background.default }
  }
  if (!merged.colors.text?.default) {
    merged.colors.text = { default: defaults.colors.text.default }
  }

  // Ensure required typography
  if (!merged.typography.fontFamily) {
    merged.typography.fontFamily = defaults.typography.fontFamily
  }
  if (!merged.typography.headingFont) {
    merged.typography.headingFont = defaults.typography.headingFont
  }
  if (!merged.typography.sizes?.base) {
    merged.typography.sizes = { ...defaults.typography.sizes, ...merged.typography.sizes }
  }
  if (!merged.typography.weights?.normal) {
    merged.typography.weights = { ...defaults.typography.weights, ...merged.typography.weights }
  }

  // Ensure required spacing
  if (!merged.spacing.tokens?.md) {
    merged.spacing.tokens = { ...defaults.spacing.tokens, ...merged.spacing.tokens }
  }
  if (!merged.spacing.scale || merged.spacing.scale.length === 0) {
    merged.spacing.scale = defaults.spacing.scale
  }

  // Ensure required layout
  if (!merged.layout.variant) {
    merged.layout.variant = defaults.layout.variant
  }
  if (!merged.layout.heroStyle) {
    merged.layout.heroStyle = defaults.layout.heroStyle
  }
  if (!merged.layout.breakpoints?.sm) {
    merged.layout.breakpoints = { ...defaults.layout.breakpoints, ...merged.layout.breakpoints }
  }
  if (!merged.layout.gridColumns) {
    merged.layout.gridColumns = defaults.layout.gridColumns
  }

  // Ensure required animations
  if (merged.animations.enabled === undefined) {
    merged.animations.enabled = defaults.animations.enabled
  }

  return merged
}

/**
 * Detect missing required tokens in config
 */
export function detectMissingTokens(config: Partial<ThemeConfig>): string[] {
  const missing: string[] = []
  const contract = getTokenContract('1.0.0')

  for (const category of Object.values(contract.tokens)) {
    for (const token of category.required) {
      const value = getTokenValue(config, token.path)
      if (value === undefined || value === null) {
        missing.push(token.path)
      }
    }
  }

  return missing
}

/**
 * Get token value from config using path
 */
function getTokenValue(config: Partial<ThemeConfig>, path: string): unknown {
  const parts = path.split('.')
  let current: any = config

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = current[part]
  }

  return current
}

/**
 * Check if config is partial (missing required tokens)
 */
export function isPartialConfig(config: Partial<ThemeConfig>): boolean {
  const missing = detectMissingTokens(config)
  return missing.length > 0
}
