import type { ThemeConfig } from '@/lib/services/themes/loader'

/**
 * Get color value by path
 * Example: getColorValue(theme, 'primary.500') => '#0EA5E9'
 */
export function getColorValue(
  theme: ThemeConfig,
  path: string
): string | undefined {
  const parts = path.split('.')
  let current: any = theme.colors

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = current[part]
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Get spacing token value
 * Example: getSpacingValue(theme, 'md') => '1rem'
 */
export function getSpacingValue(theme: ThemeConfig, token: string): string | undefined {
  return theme.spacing.tokens[token]
}

/**
 * Get spacing scale value by index
 * Example: getSpacingScaleValue(theme, 0) => '0px'
 */
export function getSpacingScaleValue(theme: ThemeConfig, index: number): string | undefined {
  const value = theme.spacing.scale[index]
  return value !== undefined ? `${value}px` : undefined
}

/**
 * Get typography value by path
 * Example: getTypographyValue(theme, 'sizes.base') => '1rem'
 */
export function getTypographyValue(
  theme: ThemeConfig,
  path: string
): string | number | undefined {
  const parts = path.split('.')
  let current: any = theme.typography

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = current[part]
  }

  return current
}

/**
 * Get layout breakpoint value
 * Example: getLayoutBreakpoint(theme, 'sm') => '640px'
 */
export function getLayoutBreakpoint(theme: ThemeConfig, breakpoint: string): string | undefined {
  return theme.layout.breakpoints[breakpoint as keyof typeof theme.layout.breakpoints]
}

/**
 * Get container width value
 * Example: getContainerWidth(theme, 'md') => '768px'
 */
export function getContainerWidth(theme: ThemeConfig, size: string): string | undefined {
  return theme.layout.containerWidths[size]
}

/**
 * Get animation duration value
 * Example: getAnimationDuration(theme, 'fast') => '100ms'
 */
export function getAnimationDuration(theme: ThemeConfig, name: string): string | undefined {
  return theme.animations.durations[name]
}

/**
 * Get animation easing value
 * Example: getAnimationEasing(theme, 'easeIn') => 'cubic-bezier(0.4, 0, 1, 1)'
 */
export function getAnimationEasing(theme: ThemeConfig, name: string): string | undefined {
  return theme.animations.easings[name]
}

/**
 * Get transition value
 * Example: getTransition(theme, 'default') => '150ms ease-in-out'
 */
export function getTransition(theme: ThemeConfig, name: string): string | undefined {
  return theme.animations.transitions[name]
}

/**
 * Check if dark mode is available in theme
 */
export function isDarkModeAvailable(theme: ThemeConfig): boolean {
  return !!theme.colors.dark
}

/**
 * Get dark mode color value
 * Example: getDarkColorValue(theme, 'primary.500') => '#0EA5E9'
 */
export function getDarkColorValue(
  theme: ThemeConfig,
  path: string
): string | undefined {
  if (!theme.colors.dark) {
    return undefined
  }

  const parts = path.split('.')
  let current: any = theme.colors.dark

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = current[part]
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Get asset URL
 * Example: getAssetUrl(theme, 'logo') => 'https://...'
 */
export function getAssetUrl(theme: ThemeConfig, assetName: keyof NonNullable<ThemeConfig['assets']>): string | undefined {
  return theme.assets?.[assetName]
}
