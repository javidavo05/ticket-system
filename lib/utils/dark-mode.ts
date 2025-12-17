/**
 * Dark mode utilities
 * Handles persistence, system preference detection, and theme application
 */

export type DarkModeValue = 'light' | 'dark'
export type DarkModePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'dark-mode-preference'
const COOKIE_NAME = 'dark-mode-preference'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 year

/**
 * Get stored theme preference from localStorage
 */
export function getStoredTheme(): DarkModePreference | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored as DarkModePreference
    }
  } catch (error) {
    console.warn('Failed to read from localStorage:', error)
  }

  return null
}

/**
 * Set stored theme preference in localStorage and cookie
 */
export function setStoredTheme(preference: DarkModePreference): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, preference)
    
    // Also set cookie for server-side access
    document.cookie = `${COOKIE_NAME}=${preference}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
  } catch (error) {
    console.warn('Failed to write to localStorage:', error)
  }
}

/**
 * Get theme preference from cookie (for server-side)
 */
export function getThemeFromCookie(): DarkModePreference | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === COOKIE_NAME) {
      if (value === 'light' || value === 'dark' || value === 'system') {
        return value as DarkModePreference
      }
    }
  }

  return null
}

/**
 * Get system preference (OS-level dark mode setting)
 */
export function getSystemPreference(): DarkModeValue {
  if (typeof window === 'undefined') {
    return 'light'
  }

  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
  } catch (error) {
    console.warn('Failed to detect system preference:', error)
  }

  return 'light'
}

/**
 * Get computed theme value (resolves 'system' to actual light/dark)
 */
export function getComputedTheme(preference: DarkModePreference): DarkModeValue {
  if (preference === 'system') {
    return getSystemPreference()
  }
  return preference
}

/**
 * Apply theme class to document root
 */
export function applyTheme(value: DarkModeValue): void {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  
  // Remove existing theme classes
  root.classList.remove('light', 'dark')
  
  // Add new theme class
  root.classList.add(value)
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    // Get theme color from CSS variables
    const computedStyle = getComputedStyle(root)
    const bgColor = computedStyle.getPropertyValue('--color-background-default').trim() || '#ffffff'
    metaThemeColor.setAttribute('content', bgColor)
  }
}

/**
 * Initialize theme on page load
 */
export function initializeTheme(): DarkModeValue {
  // Try to get from storage first
  const stored = getStoredTheme()
  
  // Fallback to cookie (for SSR)
  const cookieTheme = stored || getThemeFromCookie()
  
  // Fallback to system preference
  const preference: DarkModePreference = cookieTheme || 'system'
  
  // Compute actual theme value
  const computed = getComputedTheme(preference)
  
  // Apply theme
  applyTheme(computed)
  
  return computed
}

/**
 * Listen for system preference changes
 */
export function watchSystemPreference(
  callback: (value: DarkModeValue) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      callback(e.matches ? 'dark' : 'light')
    }
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange)
      return () => {
        mediaQuery.removeListener(handleChange)
      }
    }
  } catch (error) {
    console.warn('Failed to watch system preference:', error)
  }

  return () => {}
}
