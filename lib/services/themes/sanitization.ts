import type { ThemeConfig } from './loader'

/**
 * Sanitized theme config (all values validated and safe)
 */
export interface SanitizedThemeConfig extends ThemeConfig {
  // Config is validated and sanitized
}

/**
 * Hex color regex for validation
 */
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

/**
 * Safe URL protocols (whitelist)
 */
const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'data:']

/**
 * Sanitize color value
 * Ensures hex format and prevents CSS injection
 */
export function sanitizeColorValue(color: string): string {
  // Remove any whitespace
  const trimmed = color.trim()
  
  // Validate hex format
  if (!HEX_COLOR_REGEX.test(trimmed)) {
    // If invalid, return safe default (black)
    console.warn(`Invalid color value: ${color}, using default #000000`)
    return '#000000'
  }
  
  return trimmed.toUpperCase()
}

/**
 * Sanitize font family name
 * Prevents XSS via font family injection
 */
export function sanitizeFontFamily(font: string): string {
  // Remove any HTML tags
  const noTags = font.replace(/<[^>]*>/g, '')
  
  // Remove script tags and event handlers
  const noScript = noTags.replace(/javascript:/gi, '').replace(/on\w+\s*=/gi, '')
  
  // Only allow safe characters: alphanumeric, spaces, commas, quotes, hyphens, underscores
  const sanitized = noScript.replace(/[^a-zA-Z0-9\s,'"\-_]/g, '')
  
  // Limit length
  if (sanitized.length > 200) {
    return sanitized.substring(0, 200)
  }
  
  return sanitized || 'system-ui, sans-serif'
}

/**
 * Sanitize URL
 * Prevents javascript: protocol and validates URL format
 */
export function sanitizeURL(url: string | undefined): string | undefined {
  if (!url) {
    return undefined
  }
  
  try {
    const urlObj = new URL(url)
    
    // Check protocol whitelist
    if (!SAFE_URL_PROTOCOLS.includes(urlObj.protocol)) {
      console.warn(`Unsafe URL protocol: ${urlObj.protocol}, rejecting`)
      return undefined
    }
  
    // Return sanitized URL
    return urlObj.toString()
  } catch (error) {
    // Invalid URL format
    console.warn(`Invalid URL format: ${url}`)
    return undefined
  }
}

/**
 * Sanitize CSS size value
 * Validates CSS units and prevents injection
 */
export function sanitizeCSSSize(size: string): string {
  // Remove any script tags
  const noScript = size.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '')
  
  // Validate CSS unit format: number + unit (rem, em, px, %, etc.)
  // Or allow calc(), var(), or numeric values
  const cssUnitRegex = /^-?\d+(\.\d+)?(rem|em|px|%|vh|vw|ch|ex|cm|mm|in|pt|pc)$/
  const isCalc = /^calc\([^)]+\)$/.test(noScript)
  const isVar = /^var\([^)]+\)$/.test(noScript)
  const isNumeric = /^-?\d+(\.\d+)?$/.test(noScript)
  
  if (cssUnitRegex.test(noScript) || isCalc || isVar || isNumeric) {
    return noScript
  }
  
  // If invalid, return safe default
  console.warn(`Invalid CSS size: ${size}, using default 1rem`)
  return '1rem'
}

/**
 * Sanitize CSS duration value (for animations)
 * Allows ms and s units
 */
export function sanitizeCSSDuration(duration: string): string {
  // Remove any script tags
  const noScript = duration.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '')
  
  // Validate CSS duration: number + ms or s
  const durationRegex = /^\d+(\.\d+)?(ms|s)$/
  const isCalc = /^calc\([^)]+\)$/.test(noScript)
  const isVar = /^var\([^)]+\)$/.test(noScript)
  
  if (durationRegex.test(noScript) || isCalc || isVar) {
    return noScript
  }
  
  // If invalid, return safe default
  console.warn(`Invalid CSS duration: ${duration}, using default 200ms`)
  return '200ms'
}

/**
 * Sanitize CSS transition/animation value
 */
export function sanitizeCSSTransition(value: string): string {
  // Remove script tags
  const noScript = value.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '')
  
  // Basic validation: should be duration + timing-function
  // Examples: "150ms ease-in-out", "0.3s cubic-bezier(0.4, 0, 0.2, 1)"
  const transitionRegex = /^[\d.]+(ms|s)\s+[a-z-]+(\([^)]+\))?$/i
  
  if (transitionRegex.test(noScript) || noScript.includes('cubic-bezier')) {
    return noScript
  }
  
  // Default safe transition
  return '150ms ease-in-out'
}

/**
 * Sanitize entire theme config
 * Applies all sanitization functions to prevent injection attacks
 */
export function sanitizeThemeConfig(config: ThemeConfig): SanitizedThemeConfig {
  // Sanitize colors
  const sanitizedColors: ThemeConfig['colors'] = {
    primary: Object.fromEntries(
      Object.entries(config.colors.primary).map(([key, value]) => [
        key,
        sanitizeColorValue(value),
      ])
    ) as ThemeConfig['colors']['primary'],
    secondary: Object.fromEntries(
      Object.entries(config.colors.secondary).map(([key, value]) => [
        key,
        sanitizeColorValue(value),
      ])
    ) as ThemeConfig['colors']['secondary'],
    success: Object.fromEntries(
      Object.entries(config.colors.success).map(([key, value]) => [
        key,
        value ? sanitizeColorValue(value) : undefined,
      ])
    ) as ThemeConfig['colors']['success'],
    error: Object.fromEntries(
      Object.entries(config.colors.error).map(([key, value]) => [
        key,
        value ? sanitizeColorValue(value) : undefined,
      ])
    ) as ThemeConfig['colors']['error'],
    warning: Object.fromEntries(
      Object.entries(config.colors.warning).map(([key, value]) => [
        key,
        value ? sanitizeColorValue(value) : undefined,
      ])
    ) as ThemeConfig['colors']['warning'],
    info: Object.fromEntries(
      Object.entries(config.colors.info).map(([key, value]) => [
        key,
        value ? sanitizeColorValue(value) : undefined,
      ])
    ) as ThemeConfig['colors']['info'],
    neutral: Object.fromEntries(
      Object.entries(config.colors.neutral).map(([key, value]) => [
        key,
        sanitizeColorValue(value),
      ])
    ) as ThemeConfig['colors']['neutral'],
    accent: config.colors.accent
      ? {
          500: sanitizeColorValue(config.colors.accent[500]),
        }
      : undefined,
    background: {
      default: sanitizeColorValue(config.colors.background.default),
    },
    text: {
      default: sanitizeColorValue(config.colors.text.default),
    },
    dark: config.colors.dark
      ? {
          primary: config.colors.dark.primary
            ? Object.fromEntries(
                Object.entries(config.colors.dark.primary).map(([key, value]) => [
                  key,
                  value ? sanitizeColorValue(value) : undefined,
                ])
              )
            : undefined,
          secondary: config.colors.dark.secondary
            ? Object.fromEntries(
                Object.entries(config.colors.dark.secondary).map(([key, value]) => [
                  key,
                  value ? sanitizeColorValue(value) : undefined,
                ])
              )
            : undefined,
          success: config.colors.dark.success
            ? { 500: sanitizeColorValue(config.colors.dark.success[500]) }
            : undefined,
          error: config.colors.dark.error
            ? { 500: sanitizeColorValue(config.colors.dark.error[500]) }
            : undefined,
          warning: config.colors.dark.warning
            ? { 500: sanitizeColorValue(config.colors.dark.warning[500]) }
            : undefined,
          info: config.colors.dark.info
            ? { 500: sanitizeColorValue(config.colors.dark.info[500]) }
            : undefined,
          background: config.colors.dark.background
            ? { default: sanitizeColorValue(config.colors.dark.background.default) }
            : undefined,
          text: config.colors.dark.text
            ? { default: sanitizeColorValue(config.colors.dark.text.default) }
            : undefined,
        }
      : undefined,
  }

  // Sanitize typography
  const sanitizedTypography: ThemeConfig['typography'] = {
    fontFamily: sanitizeFontFamily(config.typography.fontFamily),
    headingFont: sanitizeFontFamily(config.typography.headingFont),
    sizes: Object.fromEntries(
      Object.entries(config.typography.sizes).map(([key, value]) => [
        key,
        sanitizeCSSSize(value),
      ])
    ),
    weights: {
      light: Math.max(100, Math.min(900, config.typography.weights.light)),
      normal: Math.max(100, Math.min(900, config.typography.weights.normal)),
      medium: Math.max(100, Math.min(900, config.typography.weights.medium)),
      semibold: Math.max(100, Math.min(900, config.typography.weights.semibold)),
      bold: Math.max(100, Math.min(900, config.typography.weights.bold)),
    },
    lineHeights: Object.fromEntries(
      Object.entries(config.typography.lineHeights).map(([key, value]) => [
        key,
        sanitizeCSSSize(value),
      ])
    ),
    letterSpacing: Object.fromEntries(
      Object.entries(config.typography.letterSpacing).map(([key, value]) => [
        key,
        sanitizeCSSSize(value),
      ])
    ),
  }

  // Sanitize spacing
  const sanitizedSpacing: ThemeConfig['spacing'] = {
    tokens: Object.fromEntries(
      Object.entries(config.spacing.tokens).map(([key, value]) => [
        key,
        sanitizeCSSSize(value),
      ])
    ),
    scale: config.spacing.scale.map((val) => Math.max(0, val)),
  }

  // Sanitize layout
  const sanitizedLayout: ThemeConfig['layout'] = {
    variant: config.layout.variant,
    heroStyle: config.layout.heroStyle,
    breakpoints: {
      sm: sanitizeCSSSize(config.layout.breakpoints.sm),
      md: sanitizeCSSSize(config.layout.breakpoints.md),
      lg: sanitizeCSSSize(config.layout.breakpoints.lg),
      xl: sanitizeCSSSize(config.layout.breakpoints.xl),
      '2xl': sanitizeCSSSize(config.layout.breakpoints['2xl']),
    },
    containerWidths: Object.fromEntries(
      Object.entries(config.layout.containerWidths).map(([key, value]) => [
        key,
        sanitizeCSSSize(value),
      ])
    ),
    gridColumns: Math.max(1, Math.min(24, config.layout.gridColumns)),
  }

  // Sanitize animations
  const sanitizedAnimations: ThemeConfig['animations'] = {
    enabled: config.animations.enabled,
    transitions: Object.fromEntries(
      Object.entries(config.animations.transitions).map(([key, value]) => [
        key,
        sanitizeCSSTransition(value),
      ])
    ),
    durations: Object.fromEntries(
      Object.entries(config.animations.durations).map(([key, value]) => [
        key,
        sanitizeCSSDuration(value),
      ])
    ),
    easings: Object.fromEntries(
      Object.entries(config.animations.easings).map(([key, value]) => [
        key,
        sanitizeCSSTransition(value),
      ])
    ),
  }

  // Sanitize assets
  const sanitizedAssets: ThemeConfig['assets'] = config.assets
    ? {
        logo: sanitizeURL(config.assets.logo),
        logoDark: sanitizeURL(config.assets.logoDark),
        favicon: sanitizeURL(config.assets.favicon),
        background: sanitizeURL(config.assets.background),
        backgroundMobile: sanitizeURL(config.assets.backgroundMobile),
        ogImage: sanitizeURL(config.assets.ogImage),
      }
    : undefined

  return {
    colors: sanitizedColors,
    typography: sanitizedTypography,
    spacing: sanitizedSpacing,
    layout: sanitizedLayout,
    animations: sanitizedAnimations,
    assets: sanitizedAssets,
  } as ThemeConfig
}
