'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { DarkModePreference, DarkModeValue } from '@/lib/utils/dark-mode'
import {
  getStoredTheme,
  setStoredTheme,
  getSystemPreference,
  getComputedTheme,
  applyTheme,
  watchSystemPreference,
} from '@/lib/utils/dark-mode'

interface DarkModeContextValue {
  preference: DarkModePreference
  value: DarkModeValue
  setPreference: (preference: DarkModePreference) => void
  toggle: () => void
}

const DarkModeContext = createContext<DarkModeContextValue | null>(null)

/**
 * Dark Mode Provider
 * Manages dark mode state and persistence
 */
export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<DarkModePreference>(() => {
    // Initialize from storage or default to system
    if (typeof window !== 'undefined') {
      return getStoredTheme() || 'system'
    }
    return 'system'
  })

  const [value, setValue] = useState<DarkModeValue>(() => {
    // Initialize computed value
    if (typeof window !== 'undefined') {
      return getComputedTheme(preference)
    }
    return 'light'
  })

  // Update computed value when preference changes
  useEffect(() => {
    const computed = getComputedTheme(preference)
    setValue(computed)
    applyTheme(computed)
  }, [preference])

  // Watch system preference changes when preference is 'system'
  useEffect(() => {
    if (preference !== 'system') {
      return
    }

    const unwatch = watchSystemPreference((systemValue) => {
      setValue(systemValue)
      applyTheme(systemValue)
    })

    return unwatch
  }, [preference])

  // Initialize on mount
  useEffect(() => {
    // Apply initial theme
    const initialValue = getComputedTheme(preference)
    applyTheme(initialValue)
    setValue(initialValue)
  }, [])

  const setPreference = useCallback((newPreference: DarkModePreference) => {
    setPreferenceState(newPreference)
    setStoredTheme(newPreference)
    
    const computed = getComputedTheme(newPreference)
    setValue(computed)
    applyTheme(computed)
  }, [])

  const toggle = useCallback(() => {
    if (preference === 'system') {
      // If system, toggle to opposite of current system preference
      const systemValue = getSystemPreference()
      const newPreference = systemValue === 'dark' ? 'light' : 'dark'
      setPreference(newPreference)
    } else if (preference === 'light') {
      setPreference('dark')
    } else {
      setPreference('light')
    }
  }, [preference, setPreference])

  return (
    <DarkModeContext.Provider
      value={{
        preference,
        value,
        setPreference,
        toggle,
      }}
    >
      {children}
    </DarkModeContext.Provider>
  )
}

/**
 * Hook to access dark mode context
 */
export function useDarkModeContext(): DarkModeContextValue {
  const context = useContext(DarkModeContext)
  if (!context) {
    throw new Error('useDarkModeContext must be used within DarkModeProvider')
  }
  return context
}
