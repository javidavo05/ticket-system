'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { WebNFCService } from '@/lib/nfc/web-nfc'
import { NFCBindingFlow, type BindingState, type TagReadResult } from '@/lib/nfc/binding-flow'
import {
  NFCError,
  NFCNotSupportedError,
  NFCDisabledError,
  NFCAbortError,
  NFCTagAlreadyBoundError,
  NFCTagInvalidError,
  NFCTokenExpiredError,
  NFCNetworkError,
} from '@/lib/nfc/errors'
import { getCurrentUserAction } from '@/server-actions/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { NFCStatus } from './nfc-status'
import { BindingSteps } from './binding-steps'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react'

export function NFCBindingScreen() {
  const router = useRouter()
  const [state, setState] = useState<BindingState>({ step: 'idle' })
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Get current user on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUserAction()
        if (user) {
          setUserId(user.id)
        } else {
          router.push('/admin/login?redirect=/admin/nfc/bind')
        }
      } catch (error) {
        console.error('Error loading user:', error)
        router.push('/admin/login?redirect=/admin/nfc/bind')
      }
    }
    loadUser()
  }, [router])

  // Check NFC support on mount
  useEffect(() => {
    if (!WebNFCService.isSupported()) {
      setState({
        step: 'error',
        error: 'NFC no está disponible en este dispositivo',
      })
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      WebNFCService.cleanup()
    }
  }, [])

  const handlePrepare = useCallback(async () => {
    if (!userId) {
      setState({ step: 'error', error: 'Usuario no autenticado' })
      return
    }

    setIsLoading(true)
    setState({ step: 'preparing' })

    try {
      const { token, expiresAt } = await NFCBindingFlow.prepareBinding(userId)
      setState({
        step: 'ready',
        token,
        expiresAt,
      })
    } catch (error: any) {
      if (error instanceof NFCNetworkError) {
        setState({ step: 'error', error: error.message })
      } else {
        setState({ step: 'error', error: error.message || 'Error al preparar vinculación' })
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const handleWrite = useCallback(async (token: string, bandUid?: string) => {
    setIsLoading(true)
    setState((prev) => ({ ...prev, step: 'writing' }))

    try {
      // Write and confirm
      setState((prev) => ({ ...prev, step: 'confirming' }))
      const result = await NFCBindingFlow.writeAndConfirm(token, bandUid)

      setState({
        step: 'success',
        bandId: result.bandId,
        securityToken: result.securityToken,
      })
    } catch (error: any) {
      if (error instanceof NFCTokenExpiredError) {
        // Token expired, restart flow
        setState({ step: 'error', error: 'El token expiró. Intenta nuevamente.' })
        // Auto-retry after a moment
        setTimeout(() => {
          if (userId) {
            handlePrepare()
          }
        }, 2000)
      } else if (error instanceof NFCTagAlreadyBoundError) {
        setState({ step: 'error', error: error.message })
      } else if (error instanceof NFCNetworkError) {
        setState({ step: 'error', error: error.message })
      } else {
        setState({ step: 'error', error: error.message || 'Error al escribir o confirmar' })
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId, handlePrepare])

  const handleRead = useCallback(async () => {
    setIsLoading(true)
    setState((prev) => ({ ...prev, step: 'reading' }))

    try {
      const readResult: TagReadResult = await NFCBindingFlow.readTag()

      // Check tag state
      if (readResult.state === 'bound') {
        setState({
          step: 'error',
          error: 'Esta pulsera ya está vinculada a otro usuario',
        })
        return
      }

      if (readResult.state === 'invalid') {
        setState({
          step: 'error',
          error: 'La pulsera contiene datos inválidos o corruptos',
        })
        return
      }

      if (readResult.state === 'expired') {
        // Token expired, but we can still bind with new token
        // Continue to write step
      }

      // Ready to write - automatically proceed if we have a token
      const currentToken = state.token
      if (currentToken) {
        setState((prev) => ({
          ...prev,
          step: 'writing',
          bandUid: readResult.uid,
          payload: readResult.payload,
        }))
        await handleWrite(currentToken, readResult.uid)
      } else {
        // No token, go back to ready (shouldn't happen)
        setState((prev) => ({ ...prev, step: 'ready', bandUid: readResult.uid }))
      }
    } catch (error: any) {
      if (error instanceof NFCAbortError) {
        // User cancelled, return to ready state
        setState((prev) => ({ ...prev, step: 'ready' }))
      } else if (error instanceof NFCNotSupportedError || error instanceof NFCDisabledError) {
        setState({ step: 'error', error: error.message })
      } else {
        setState({ step: 'error', error: error.message || 'Error al leer la pulsera' })
      }
    } finally {
      setIsLoading(false)
    }
  }, [state.token, handleWrite])


  const handleRetry = useCallback(() => {
    setState({ step: 'idle' })
    if (userId) {
      handlePrepare()
    }
  }, [userId, handlePrepare])

  const handleCompleteFlow = useCallback(async () => {
    if (!userId) {
      setState({ step: 'error', error: 'Usuario no autenticado' })
      return
    }

    setIsLoading(true)
    setState({ step: 'preparing' })

    try {
      // Step 1: Prepare
      const { token } = await NFCBindingFlow.prepareBinding(userId)
      setState({ step: 'ready', token })

      // Step 2: Read
      setState((prev) => ({ ...prev, step: 'reading' }))
      const readResult = await NFCBindingFlow.readTag()

      if (readResult.state === 'bound') {
        throw new NFCTagAlreadyBoundError()
      }

      if (readResult.state === 'invalid') {
        throw new NFCTagInvalidError('La pulsera contiene datos inválidos')
      }

      // Step 3: Write & Confirm
      setState((prev) => ({ ...prev, step: 'writing' }))
      const result = await NFCBindingFlow.writeAndConfirm(token, readResult.uid)

      setState({
        step: 'success',
        bandId: result.bandId,
        securityToken: result.securityToken,
      })
    } catch (error: any) {
      if (error instanceof NFCAbortError) {
        setState((prev) => {
          // If we had a token, go back to ready state
          if (prev.token) {
            return { ...prev, step: 'ready' }
          }
          return { step: 'idle' }
        })
      } else if (error instanceof NFCNotSupportedError || error instanceof NFCDisabledError) {
        setState({ step: 'error', error: error.message })
      } else if (error instanceof NFCTokenExpiredError) {
        setState({ step: 'error', error: 'El token expiró. Intenta nuevamente.' })
      } else {
        setState({ step: 'error', error: error.message || 'Error en el proceso de vinculación' })
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Render based on state
  if (state.step === 'idle') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Vincular Pulsera NFC</CardTitle>
          <CardDescription>
            Vincula una pulsera NFC a tu cuenta en 3 pasos simples
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NFCStatus />
          <Button
            onClick={handleCompleteFlow}
            disabled={!userId || isLoading || !WebNFCService.isSupported()}
            loading={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Preparando...' : 'Comenzar Vinculación'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (state.step === 'preparing') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Preparando Vinculación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BindingSteps currentStep="preparing" />
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
          <p className="text-center text-gray-600">Obteniendo token de vinculación...</p>
        </CardContent>
      </Card>
    )
  }

  if (state.step === 'ready') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Listo para Leer</CardTitle>
          <CardDescription>
            Acerca la pulsera NFC al teléfono
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BindingSteps currentStep="ready" />
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary-100 mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Esperando pulsera NFC...
            </p>
            <p className="text-sm text-gray-600">
              Acerca la pulsera al teléfono para leerla
            </p>
          </div>
          <Button
            onClick={handleRead}
            disabled={isLoading}
            loading={isLoading}
            className="w-full"
            size="lg"
          >
            Leer Pulsera
          </Button>
          <Button
            onClick={() => setState({ step: 'idle' })}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (state.step === 'reading') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Leyendo Pulsera</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BindingSteps currentStep="reading" />
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">
              Leyendo pulsera NFC...
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Mantén la pulsera cerca del teléfono
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state.step === 'writing' || state.step === 'confirming') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>
            {state.step === 'writing' ? 'Escribiendo en Pulsera' : 'Confirmando Vinculación'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BindingSteps currentStep={state.step} />
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">
              {state.step === 'writing'
                ? 'Escribiendo datos en la pulsera...'
                : 'Confirmando vinculación con el servidor...'}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {state.step === 'writing'
                ? 'Mantén la pulsera cerca del teléfono'
                : 'Por favor espera...'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state.step === 'success') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Vinculación Exitosa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BindingSteps currentStep="success" />
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success-100 mb-4">
              <CheckCircle2 className="h-12 w-12 text-success-600" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Pulsera vinculada correctamente
            </p>
            <p className="text-sm text-gray-600">
              La pulsera está lista para usar
            </p>
          </div>
          <div className="space-y-2">
            <Button
              onClick={() => router.push('/admin/nfc')}
              className="w-full"
              size="lg"
            >
              Ver Pulseras
            </Button>
            <Button
              onClick={() => setState({ step: 'idle' })}
              variant="outline"
              className="w-full"
            >
              Vincular Otra Pulsera
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state.step === 'error') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Error en Vinculación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="error">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{state.error || 'Error desconocido'}</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button
              onClick={handleRetry}
              className="flex-1"
              size="lg"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Intentar Nuevamente
            </Button>
            <Button
              onClick={() => setState({ step: 'idle' })}
              variant="outline"
              className="flex-1"
            >
              Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
