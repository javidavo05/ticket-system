'use client'

import { useEffect } from 'react'

interface ScanResultProps {
  success: boolean
  message: string
  queued?: boolean
  ticketNumber?: string
  scanCount?: number
  onClose?: () => void
}

export function ScanResult({ success, message, queued, ticketNumber, scanCount, onClose }: ScanResultProps) {
  useEffect(() => {
    // Vibrate on result (if supported)
    if ('vibrate' in navigator) {
      if (success) {
        navigator.vibrate([100, 50, 100]) // Success pattern
      } else {
        navigator.vibrate([200]) // Error pattern
      }
    }

    // Auto-close after 3 seconds if queued
    if (queued && onClose) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [success, queued, onClose])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        success
          ? 'bg-success-500/20 dark:bg-success-500/10'
          : 'bg-error-500/20 dark:bg-error-500/10'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-lg p-6 shadow-2xl ${
          success
            ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-500 dark:border-success-500'
            : 'bg-error-50 dark:bg-error-900/20 border-2 border-error-500 dark:border-error-500'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          {success ? (
            <div className="w-16 h-16 rounded-full bg-success-500 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-error-500 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Message */}
        <p
          className={`text-center text-lg font-semibold mb-2 ${
            success
              ? 'text-success-900 dark:text-success-100'
              : 'text-error-900 dark:text-error-100'
          }`}
        >
          {success ? '✓ Ticket Válido' : '✗ Ticket Inválido'}
        </p>

        <p
          className={`text-center mb-4 ${
            success
              ? 'text-success-800 dark:text-success-200'
              : 'text-error-800 dark:text-error-200'
          }`}
        >
          {message}
        </p>

        {/* Queue indicator */}
        {queued && (
          <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 text-warning-900 dark:text-warning-100 px-4 py-2 rounded mb-4">
            <p className="text-sm text-center">
              ⚠ Guardado para sincronizar cuando haya conexión
            </p>
          </div>
        )}

        {/* Ticket details */}
        {success && ticketNumber && (
          <div className="bg-white dark:bg-gray-900 rounded p-3 mb-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Ticket:</p>
            <p className="font-mono font-bold text-gray-900 dark:text-gray-100">
              {ticketNumber}
            </p>
            {scanCount !== undefined && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Escaneos: {scanCount}
              </p>
            )}
          </div>
        )}

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-full bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          >
            Continuar Escaneando
          </button>
        )}
      </div>
    </div>
  )
}

