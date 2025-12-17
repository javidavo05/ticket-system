'use client'

import { WebNFCService } from '@/lib/nfc/web-nfc'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'

interface NFCStatusProps {
  className?: string
}

export function NFCStatus({ className }: NFCStatusProps) {
  const isSupported = WebNFCService.isSupported()
  const isAndroid = WebNFCService.isAndroid()

  if (!isAndroid) {
    return (
      <Alert variant="error" className={className}>
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          NFC solo está disponible en dispositivos Android con Chrome 89+
        </AlertDescription>
      </Alert>
    )
  }

  if (!isSupported) {
    return (
      <Alert variant="error" className={className}>
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          NFC no está disponible en este navegador. Usa Chrome Android 89+ o Edge Android 89+
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="success" className={className}>
      <CheckCircle2 className="h-4 w-4" />
      <AlertDescription>
        NFC está disponible y listo para usar
      </AlertDescription>
    </Alert>
  )
}
