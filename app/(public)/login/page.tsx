'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// Función helper para guardar logs
function logToStorage(message: string, data?: any) {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}`
  console.log(logEntry)
  
  // Guardar en localStorage
  try {
    const existingLogs = localStorage.getItem('login_logs') || '[]'
    const logs = JSON.parse(existingLogs)
    logs.push(logEntry)
    // Mantener solo los últimos 50 logs
    if (logs.length > 50) logs.shift()
    localStorage.setItem('login_logs', JSON.stringify(logs))
    localStorage.setItem('login_logs_last_update', timestamp)
  } catch (e) {
    console.error('Error guardando logs:', e)
  }
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)

  const redirectTo = searchParams.get('redirect') || '/admin/dashboard'

  // Cargar logs al montar el componente
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem('login_logs')
      if (savedLogs) {
        setLogs(JSON.parse(savedLogs))
      }
    } catch (e) {
      console.error('Error cargando logs:', e)
    }
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    logToStorage('🔵 [LOGIN] Iniciando proceso de login...')
    setError(null)
    setLoading(true)

    try {
      logToStorage('🔵 [LOGIN] Creando cliente de Supabase...')
      const supabase = createClient()
      logToStorage('✅ [LOGIN] Cliente de Supabase creado')
      
      logToStorage('🔵 [LOGIN] Intentando iniciar sesión', { email, passwordLength: password.length })
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      logToStorage('🔵 [LOGIN] Respuesta de signInWithPassword', { 
        hasData: !!data, 
        hasUser: !!data?.user,
        hasError: !!signInError,
        errorMessage: signInError?.message 
      })

      if (signInError) {
        logToStorage('❌ [LOGIN] Error al iniciar sesión', signInError)
        setError(signInError.message)
        setLoading(false)
        // Actualizar logs en la UI
        const savedLogs = localStorage.getItem('login_logs')
        if (savedLogs) setLogs(JSON.parse(savedLogs))
        return
      }

      if (!data || !data.user) {
        logToStorage('❌ [LOGIN] No se recibió data o user')
        setError('Error: No se pudo obtener información del usuario')
        setLoading(false)
        const savedLogs = localStorage.getItem('login_logs')
        if (savedLogs) setLogs(JSON.parse(savedLogs))
        return
      }

      logToStorage('✅ [LOGIN] Usuario autenticado', { userId: data.user.id, email: data.user.email })

      // Verificar que la sesión se estableció correctamente
      logToStorage('🔵 [LOGIN] Verificando sesión...')
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      logToStorage('🔵 [LOGIN] Resultado de getSession', { 
        hasSession: !!sessionData?.session,
        hasError: !!sessionError,
        errorMessage: sessionError?.message 
      })
      
      if (sessionError) {
        logToStorage('❌ [LOGIN] Error al obtener sesión', sessionError)
        setError('Error: No se pudo verificar la sesión')
        setLoading(false)
        const savedLogs = localStorage.getItem('login_logs')
        if (savedLogs) setLogs(JSON.parse(savedLogs))
        return
      }

      if (!sessionData?.session) {
        logToStorage('❌ [LOGIN] La sesión no se estableció correctamente')
        setError('Error: La sesión no se estableció correctamente')
        setLoading(false)
        const savedLogs = localStorage.getItem('login_logs')
        if (savedLogs) setLogs(JSON.parse(savedLogs))
        return
      }

      logToStorage('✅ [LOGIN] Sesión verificada correctamente')
      logToStorage('🔵 [LOGIN] Redirigiendo a', { redirectTo })

      // Esperar más tiempo para que puedas ver los logs
      logToStorage('⏳ [LOGIN] Esperando 3 segundos antes de redirigir...')
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      logToStorage('🔵 [LOGIN] Ejecutando redirección...')
      // Usar window.location para hacer un refresh completo y asegurar que las cookies se lean
      window.location.href = redirectTo
    } catch (err: any) {
      logToStorage('❌ [LOGIN] Error inesperado', { message: err.message, stack: err.stack })
      setError(err.message || 'Error al iniciar sesión')
      setLoading(false)
      const savedLogs = localStorage.getItem('login_logs')
      if (savedLogs) setLogs(JSON.parse(savedLogs))
    }
  }

  const clearLogs = () => {
    localStorage.removeItem('login_logs')
    localStorage.removeItem('login_logs_last_update')
    setLogs([])
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

          <div className="text-center space-y-2">
            <Link
              href="/"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Volver al inicio
            </Link>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const savedLogs = localStorage.getItem('login_logs')
                  if (savedLogs) setLogs(JSON.parse(savedLogs))
                  setShowLogs(!showLogs)
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                {showLogs ? 'Ocultar' : 'Ver'} Logs de Debug
              </button>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={clearLogs}
                  className="text-xs text-red-500 hover:text-red-700 underline"
                >
                  Limpiar Logs
                </button>
              )}
            </div>
          </div>
        </form>

        {showLogs && logs.length > 0 && (
          <div className="mt-8 p-4 bg-gray-900 text-green-400 rounded-lg max-h-96 overflow-y-auto">
            <div className="text-xs font-mono space-y-1">
              <div className="text-white mb-2 font-bold">Logs de Debug (últimos {logs.length}):</div>
              {logs.map((log, index) => (
                <div key={index} className="text-xs">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

