'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useDarkMode } from '@/lib/hooks/use-dark-mode'
import type { DarkModePreference } from '@/lib/utils/dark-mode'
import { cn } from '@/lib/utils/cn'

interface DarkModeToggleProps {
  variant?: 'button' | 'dropdown'
  className?: string
}

/**
 * Dark Mode Toggle Component
 * Supports three states: light, dark, system
 */
export function DarkModeToggle({ variant = 'button', className }: DarkModeToggleProps) {
  const { preference, setPreference, value } = useDarkMode()

  if (variant === 'dropdown') {
    return (
      <div className={cn('relative', className)}>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle dark mode"
          aria-haspopup="true"
          aria-expanded="false"
        >
          {value === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {preference === 'system' ? 'System' : preference === 'dark' ? 'Dark' : 'Light'}
          </span>
        </button>
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            <button
              type="button"
              onClick={() => setPreference('light')}
              className={cn(
                'w-full text-left px-4 py-2 text-sm flex items-center gap-2',
                preference === 'light'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              type="button"
              onClick={() => setPreference('dark')}
              className={cn(
                'w-full text-left px-4 py-2 text-sm flex items-center gap-2',
                preference === 'dark'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
            <button
              type="button"
              onClick={() => setPreference('system')}
              className={cn(
                'w-full text-left px-4 py-2 text-sm flex items-center gap-2',
                preference === 'system'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <Monitor className="h-4 w-4" />
              System
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Simple button variant - cycles through light -> dark -> system
  return (
    <button
      type="button"
      onClick={() => {
        if (preference === 'light') {
          setPreference('dark')
        } else if (preference === 'dark') {
          setPreference('system')
        } else {
          setPreference('light')
        }
      }}
      className={cn(
        'p-2 rounded-md transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'text-gray-700 dark:text-gray-300',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
        className
      )}
      aria-label={`Current mode: ${preference}. Click to change.`}
      title={`Dark mode: ${preference}`}
    >
      {value === 'dark' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  )
}
