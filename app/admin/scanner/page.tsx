'use client'

import { useState, useEffect, useRef } from 'react'
import { MobileScanner } from '@/components/scanner/mobile-scanner'
import { setupAutoSync } from '@/lib/offline/sync'
import { registerServiceWorker } from '@/lib/pwa/register'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

// Detect if device is mobile
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export default function ScannerPage() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(isMobileDevice())
    
    // Register service worker for PWA
    registerServiceWorker()

    // Setup auto-sync for offline queue
    const cleanup = setupAutoSync((summary) => {
      if (summary.total > 0) {
        console.log(`Sincronizados ${summary.successful} de ${summary.total} escaneos`)
      }
    })

    return cleanup
  }, [])

  // Use mobile scanner on mobile devices, desktop version otherwise
  if (isMobile) {
    return <MobileScanner />
  }

  // Desktop version (fallback to original implementation)
  return <DesktopScanner />
}

// Desktop scanner component (original implementation)
function DesktopScanner() {
  const [qrData, setQrData] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<any>(null)
  const scanAreaRef = useRef<HTMLDivElement>(null)

  const handleScan = async (qrCode?: string) => {
    const codeToScan = qrCode || qrData
    if (!codeToScan) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/scanner/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrSignature: codeToScan }),
      })

      const scanResult = await response.json()
      setResult(scanResult)
      
      // Don't auto-stop scanner - let user manually stop if they want
      // Scanner will continue scanning for more tickets
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Error al escanear',
      })
    } finally {
      setLoading(false)
    }
  }

  const startScanning = async () => {
    if (!scanAreaRef.current) return

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const html5QrCode = new Html5Qrcode(scanAreaRef.current.id)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScan(decodedText)
        },
        () => {
          // Ignore scanning errors
        }
      )

      setScanning(true)
      setCameraError(null)
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

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current.clear()
        scannerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Escáner de Tickets
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Valida tickets escaneando códigos QR
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <div
            id="qr-reader"
            ref={scanAreaRef}
            className="w-full mb-4 rounded-lg overflow-hidden"
            style={{ display: scanning ? 'block' : 'none' }}
          />
          
          {cameraError && (
            <Alert variant="warning" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{cameraError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 mb-4">
            {!scanning ? (
              <Button
                onClick={startScanning}
                className="flex-1"
                size="lg"
              >
                Iniciar Escáner de Cámara
              </Button>
            ) : (
              <Button
                onClick={stopScanning}
                variant="danger"
                className="flex-1"
                size="lg"
              >
                Detener Escáner
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            O Ingresa el Código QR Manualmente
          </label>
          <textarea
            value={qrData}
            onChange={(e) => setQrData(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            rows={4}
            placeholder="Pega el código QR aquí"
          />
        </div>

        <Button
          onClick={() => handleScan()}
          disabled={loading || !qrData}
          className="w-full"
          size="lg"
        >
          {loading ? 'Validando...' : 'Validar Ticket'}
        </Button>

        {result && (
          <Alert
            variant={result.success ? 'success' : 'error'}
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-1">
                {result.success ? '✓ Ticket Válido' : '✗ Ticket Inválido'}
              </p>
              <p>{result.message}</p>
              {result.ticketNumber && (
                <p className="mt-2 text-sm">Ticket: {result.ticketNumber}</p>
              )}
              {result.scanCount !== undefined && (
                <p className="mt-2 text-sm">Escaneos: {result.scanCount}</p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

