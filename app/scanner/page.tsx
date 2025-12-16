'use client'

import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { processScanAction } from '@/server-actions/admin/scanning/validate'

export default function ScannerPage() {
  const [qrData, setQrData] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scanAreaRef = useRef<HTMLDivElement>(null)

  const handleScan = async (qrCode?: string) => {
    const codeToScan = qrCode || qrData
    if (!codeToScan) return

    setLoading(true)
    setResult(null)

    try {
      const scanResult = await processScanAction(codeToScan)
      setResult(scanResult)
      
      // Stop scanning on successful scan
      if (scanResult.success && scanning) {
        stopScanning()
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Scan failed',
      })
    } finally {
      setLoading(false)
    }
  }

  const startScanning = async () => {
    if (!scanAreaRef.current) return

    try {
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
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      )

      setScanning(true)
      setCameraError(null)
    } catch (error: any) {
      setCameraError(error.message || 'Failed to start camera')
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
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Ticket Scanner</h1>

      <div className="space-y-4">
        {/* Camera Scanner */}
        <div>
          <div
            id="qr-reader"
            ref={scanAreaRef}
            className="w-full mb-4"
            style={{ display: scanning ? 'block' : 'none' }}
          />
          
          {cameraError && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              {cameraError}
            </div>
          )}

          <div className="flex gap-2 mb-4">
            {!scanning ? (
              <button
                onClick={startScanning}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
              >
                Start Camera Scanner
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700"
              >
                Stop Scanner
              </button>
            )}
          </div>
        </div>

        {/* Manual Entry */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-2">Or Enter QR Code Manually</label>
          <textarea
            value={qrData}
            onChange={(e) => setQrData(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            rows={4}
            placeholder="Paste QR code data here"
          />
        </div>

        <button
          onClick={() => handleScan()}
          disabled={loading || !qrData}
          className="w-full bg-black text-white px-6 py-3 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Validating...' : 'Validate Ticket'}
        </button>

        {result && (
          <div className={`p-4 rounded ${result.success ? 'bg-green-100 border border-green-400' : 'bg-red-100 border border-red-400'}`}>
            <p className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? '✓ Valid Ticket' : '✗ Invalid Ticket'}
            </p>
            <p className="mt-2">{result.message}</p>
            {result.ticketNumber && (
              <p className="mt-2 text-sm">Ticket: {result.ticketNumber}</p>
            )}
            {result.scanCount !== undefined && (
              <p className="mt-2 text-sm">Scans: {result.scanCount}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

