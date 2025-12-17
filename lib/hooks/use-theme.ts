'use client'

import { useThemeContext } from '@/lib/contexts/theme-context'
import type { ThemeConfig } from '@/lib/services/themes/loader'

/**
 * Main theme hook
 * Provides access to the full theme context
 */
export function useTheme() {
  return useThemeContext()
}

/**
 * Hook for accessing theme colors
 */
export function useThemeColors() {
  const { colors } = useThemeContext()
  return colors
}

/**
 * Hook for accessing theme typography
 */
export function useThemeTypography() {
  const { typography } = useThemeContext()
  return typography
}

/**
 * Hook for accessing theme spacing
 */
export function useThemeSpacing() {
  const { spacing } = useThemeContext()
  return spacing
}

/**
 * Hook for accessing theme layout
 */
export function useThemeLayout() {
  const { layout } = useThemeContext()
  return layout
}

/**
 * Hook for accessing theme animations
 */
export function useThemeAnimations() {
  const { animations } = useThemeContext()
  return animations
}

/**
 * Hook for accessing theme assets
 */
export function useThemeAssets() {
  const { assets } = useThemeContext()
  return assets
}

/**
 * Hook to check if animations are enabled
 */
export function useThemeAnimationsEnabled(): boolean {
  const { animations } = useThemeContext()
  return animations.enabled
}

/**
 * Hook to get theme source
 */
export function useThemeSource(): 'domain' | 'event' | 'organization' | 'default' {
  const { source } = useThemeContext()
  return source
}
