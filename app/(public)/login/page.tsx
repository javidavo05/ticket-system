'use client'

import { useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const redirectTo = searchParams.get('redirect') || '/admin/dashboard'

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log('🔵 [LOGIN] Iniciando proceso de login...')
    setError(null)
    setLoading(true)

    try {
      console.log('🔵 [LOGIN] Creando cliente de Supabase...')
      const supabase = createClient()
      console.log('✅ [LOGIN] Cliente de Supabase creado')
      
      console.log('🔵 [LOGIN] Intentando iniciar sesión con:', { email, passwordLength: password.length })
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('🔵 [LOGIN] Respuesta de signInWithPassword:', { 
        hasData: !!data, 
        hasUser: !!data?.user,
        hasError: !!signInError,
        errorMessage: signInError?.message 
      })

      if (signInError) {
        console.error('❌ [LOGIN] Error al iniciar sesión:', signInError)
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (!data || !data.user) {
        console.error('❌ [LOGIN] No se recibió data o user')
        setError('Error: No se pudo obtener información del usuario')
        setLoading(false)
        return
      }

      console.log('✅ [LOGIN] Usuario autenticado:', { userId: data.user.id, email: data.user.email })

      // Verificar que la sesión se estableció correctamente
      console.log('🔵 [LOGIN] Verificando sesión...')
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      console.log('🔵 [LOGIN] Resultado de getSession:', { 
        hasSession: !!sessionData?.session,
        hasError: !!sessionError,
        errorMessage: sessionError?.message 
      })
      
      if (sessionError) {
        console.error('❌ [LOGIN] Error al obtener sesión:', sessionError)
        setError('Error: No se pudo verificar la sesión')
        setLoading(false)
        return
      }

      if (!sessionData?.session) {
        console.error('❌ [LOGIN] La sesión no se estableció correctamente')
        setError('Error: La sesión no se estableció correctamente')
        setLoading(false)
        return
      }

      console.log('✅ [LOGIN] Sesión verificada correctamente')
      console.log('🔵 [LOGIN] Redirigiendo a:', redirectTo)

      // Esperar un momento para que las cookies se establezcan
      await new Promise(resolve => setTimeout(resolve, 200))
      
      console.log('🔵 [LOGIN] Ejecutando redirección...')
      // Usar window.location para hacer un refresh completo y asegurar que las cookies se lean
      window.location.href = redirectTo
    } catch (err: any) {
      console.error('❌ [LOGIN] Error inesperado:', err)
      console.error('❌ [LOGIN] Stack:', err.stack)
      setError(err.message || 'Error al iniciar sesión')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Accede al panel de administración
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Volver al inicio
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

