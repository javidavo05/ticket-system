'use client'

import { useDarkModeContext } from '@/lib/contexts/dark-mode-context'
import type { DarkModePreference, DarkModeValue } from '@/lib/utils/dark-mode'

/**
 * Hook to access dark mode functionality
 */
export function useDarkMode() {
  return useDarkModeContext()
}

/**
 * Hook to get computed dark mode value (light or dark)
 * This resolves 'system' preference to actual light/dark
 */
export function useDarkModeValue(): DarkModeValue {
  const { value } = useDarkModeContext()
  return value
}

/**
 * Hook to check if dark mode is active
 */
export function useIsDarkMode(): boolean {
  const value = useDarkModeValue()
  return value === 'dark'
}

/**
 * Hook to get current preference (light, dark, or system)
 */
export function useDarkModePreference(): DarkModePreference {
  const { preference } = useDarkModeContext()
  return preference
}
