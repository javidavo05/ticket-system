'use client'

import { useMemo } from 'react'
import { ThemeContext } from '@/lib/contexts/theme-context'
import type { ThemeProviderProps, ThemeContextValue } from '@/types/theme'
import { generateThemeCSSVariables } from '@/lib/services/themes/renderer'
import { DarkModeProvider } from '@/lib/contexts/dark-mode-context'

/**
 * Theme Provider Component
 * 
 * Injects theme CSS variables and provides theme context to children.
 * Also wraps with DarkModeProvider for dark mode support.
 * This component should be rendered server-side with theme data resolved
 * from the server.
 */
export function ThemeProvider({ theme, source = 'default', children }: ThemeProviderProps) {
  // Generate CSS variables from theme config
  const cssVariables = useMemo(() => {
    return generateThemeCSSVariables(theme)
  }, [theme])

  // Create context value
  const contextValue: ThemeContextValue = useMemo(
    () => ({
      config: theme,
      source,
      colors: theme.colors,
      typography: theme.typography,
      spacing: theme.spacing,
      layout: theme.layout,
      animations: theme.animations,
      assets: theme.assets,
    }),
    [theme, source]
  )

  return (
    <DarkModeProvider>
      <ThemeContext.Provider value={contextValue}>
        <style
          dangerouslySetInnerHTML={{
            __html: cssVariables,
          }}
        />
        {children}
      </ThemeContext.Provider>
    </DarkModeProvider>
  )
}
