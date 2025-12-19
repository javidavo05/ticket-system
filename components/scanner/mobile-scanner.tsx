'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { validateTicketMobile } from '@/lib/services/tickets/mobile-validation'
import { getMobileQueueStats } from '@/lib/services/tickets/mobile-validation'
import { isOnline, onOnlineStatusChange } from '@/lib/offline/sync'
import { ScanResult } from './scan-result'
import { getCurrentUserAction } from '@/server-actions/auth/get-user'

interface ScanResultData {
  success: boolean
  message: string
  queued?: boolean
  ticketNumber?: string
  scanCount?: number
}

export function MobileScanner() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResultData | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const [queueStats, setQueueStats] = useState({ pending: 0, total: 0 })
  const [scannerId, setScannerId] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scanAreaRef = useRef<HTMLDivElement>(null)

  // Get current user ID
  useEffect(() => {
    getCurrentUserAction().then((user) => {
      if (user) {
        setScannerId(user.id)
      }
    })
  }, [])

  // Monitor online status
  useEffect(() => {
    setOnline(isOnline())
    const unsubscribe = onOnlineStatusChange((isOnline) => {
      setOnline(isOnline)
    })
    return unsubscribe
  }, [])

  // Update queue stats periodically
  useEffect(() => {
    const updateStats = async () => {
      const stats = await getMobileQueueStats()
      setQueueStats({ pending: stats.pending, total: stats.total })
    }

    updateStats()
    const interval = setInterval(updateStats, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const handleScan = useCallback(
    async (qrCode: string) => {
      if (!scannerId) {
        setResult({
          success: false,
          message: 'Usuario no autenticado',
        })
        return
      }

      // Get location if available
      let location: { lat: number; lng: number } | undefined
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 1000 })
          })
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
        } catch (error) {
          // Location not available, continue without it
        }
      }

      const validationResult = await validateTicketMobile(qrCode, scannerId, location)
      setResult(validationResult)

      // Update queue stats
      const stats = await getMobileQueueStats()
      setQueueStats({ pending: stats.pending, total: stats.total })

      // Continue scanning after a delay
      if (validationResult.queued) {
        setTimeout(() => {
          setResult(null)
        }, 3000)
      }
    },
    [scannerId]
  )

  const startScanning = async () => {
    if (!scanAreaRef.current || !scannerId) {
      setCameraError('Elemento de escaneo no disponible o usuario no autenticado')
      return
    }

    // Ensure element has ID
    if (!scanAreaRef.current.id) {
      scanAreaRef.current.id = 'qr-reader'
    }

    try {
      // Request camera permissions first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        })
        // Stop the test stream immediately
        stream.getTracks().forEach(track => track.stop())
      } catch (permError: any) {
        setCameraError('Permisos de cámara denegados. Por favor, permite el acceso a la cámara en la configuración del navegador.')
        setScanning(false)
        return
      }

      // Set scanning state to true first so element becomes visible
      setScanning(true)
      setCameraError(null)

      // Small delay to ensure DOM updates and element is visible
      await new Promise(resolve => setTimeout(resolve, 300))

      // Verify element is still available and visible
      if (!scanAreaRef.current) {
        setCameraError('Elemento de escaneo no disponible')
        setScanning(false)
        return
      }

      // Ensure element is visible
      scanAreaRef.current.style.display = 'block'
      scanAreaRef.current.style.visibility = 'visible'

      const html5QrCode = new Html5Qrcode(scanAreaRef.current.id)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScan(decodedText)
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      )
    } catch (error: any) {
      setCameraError(error.message || 'Error al iniciar la cámara')
      setScanning(false)
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (error) {
        // Ignore stop errors
      }
      scannerRef.current = null
    }
    setScanning(false)
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header with status indicators */}
      <div className="bg-black/90 dark:bg-gray-900/90 text-white p-4 z-10 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Escáner de Tickets</h1>
          <div className="flex items-center gap-2">
            {/* Online/Offline indicator */}
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${online ? 'bg-success-500' : 'bg-warning-500'}`}
              />
              <span className="text-xs">{online ? 'En línea' : 'Sin conexión'}</span>
            </div>
          </div>
        </div>

        {/* Queue stats */}
        {queueStats.pending > 0 && (
          <div className="bg-warning-500/20 border border-warning-500/50 rounded px-3 py-1 text-sm">
            {queueStats.pending} escaneo{queueStats.pending !== 1 ? 's' : ''} pendiente
            {queueStats.pending !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Camera view */}
      <div className="flex-1 relative">
        <div
          id="qr-reader"
          ref={scanAreaRef}
          className="w-full h-full"
          style={{ 
            display: scanning ? 'block' : 'none',
            visibility: scanning ? 'visible' : 'hidden'
          }}
        />

        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <p className="text-lg mb-4">Presiona el botón para iniciar el escáner</p>
              <button
                onClick={startScanning}
                className="bg-primary-600 dark:bg-primary-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
              >
                Iniciar Escáner
              </button>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="absolute top-4 left-4 right-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 text-warning-900 dark:text-warning-100 px-4 py-3 rounded">
            {cameraError}
          </div>
        )}
      </div>

      {/* Controls */}
      {scanning && (
        <div className="bg-black/90 dark:bg-gray-900/90 text-white p-4 border-t border-gray-800">
          <button
            onClick={stopScanning}
            className="w-full bg-error-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-error-600 transition-colors"
          >
            Detener Escáner
          </button>
        </div>
      )}

      {/* Scan result overlay */}
      {result && (
        <ScanResult
          success={result.success}
          message={result.message}
          queued={result.queued}
          ticketNumber={result.ticketNumber}
          scanCount={result.scanCount}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  )
}

