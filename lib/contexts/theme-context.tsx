'use client'

import { createContext, useContext } from 'react'
import type { ThemeContextValue } from '@/types/theme'

/**
 * Theme Context
 * Provides typed access to theme configuration throughout the app
 */
const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Hook to access theme context
 * Must be used within ThemeProvider
 */
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider')
  }
  return context
}

/**
 * Export context for direct access if needed
 */
export { ThemeContext }
