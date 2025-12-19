'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { verifyEmail } from '@/server-actions/auth/verify-email'

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const handleVerification = async (hash: string) => {
    setLoading(true)
    setError(null)

    try {
      await verifyEmail(hash)
      setVerified(true)
      setTimeout(() => {
        router.push('/login?message=email_verified')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Error al verificar email')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }

    // Verificar si hay un token en la URL (callback de verificación)
    const hash = window.location.hash
    if (hash && hash.includes('type=email')) {
      handleVerification(hash)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleResend = async () => {
    if (!email) {
      setError('Por favor, ingresa tu email')
      return
    }

    setResending(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      })

      if (resendError) {
        setError(resendError.message)
      } else {
        setError(null)
        alert('Email de verificación reenviado. Revisa tu bandeja de entrada.')
      }
    } catch (err: any) {
      setError(err.message || 'Error al reenviar email')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verificar Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {verified
              ? 'Email verificado correctamente. Redirigiendo...'
              : 'Revisa tu bandeja de entrada y haz clic en el enlace de verificación'}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {verified && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Email verificado correctamente
                </h3>
              </div>
            </div>
          </div>
        )}

        {!verified && (
          <div className="space-y-4">
            {email && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Email: <span className="font-medium">{email}</span>
                </p>
              </div>
            )}

            <div>
              <button
                onClick={handleResend}
                disabled={resending || loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? 'Reenviando...' : 'Reenviar Email de Verificación'}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  )
}

