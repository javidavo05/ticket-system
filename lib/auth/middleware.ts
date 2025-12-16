import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { isSuperAdmin } from '@/lib/supabase/rls'

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          const cookies = request.cookies.getAll()
          // Log para debugging
          if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
            console.log('🔵 [MIDDLEWARE] getAll() llamado, cookies encontradas:', cookies.length)
            // Verificar si la cookie de auth tiene el formato correcto
            const authCookie = cookies.find(c => c.name.includes('auth-token'))
            if (authCookie && authCookie.value) {
              try {
                const parsed = JSON.parse(authCookie.value)
                console.log('🔵 [MIDDLEWARE] Cookie parseada correctamente, tiene access_token:', !!parsed.access_token)
              } catch (e) {
                console.log('❌ [MIDDLEWARE] Error parseando cookie JSON:', e)
              }
            }
          }
          return cookies
        },
        setAll(cookiesToSet) {
          // Log para debugging
          if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
            console.log('🔵 [MIDDLEWARE] setAll() llamado con', cookiesToSet.length, 'cookies')
          }
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            // Asegurar que las opciones de las cookies sean correctas
            const cookieOptions = {
              ...options,
              path: options?.path || '/',
              sameSite: options?.sameSite || 'lax',
              httpOnly: options?.httpOnly ?? false,
            }
            supabaseResponse = NextResponse.next({ request })
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  // Admin routes require authentication - verificar primero
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/middleware.ts:64',message:'Admin route check',data:{pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.log('\n🔵 [MIDDLEWARE] ==========================================')
    console.log('🔵 [MIDDLEWARE] Verificando acceso a ruta admin:', pathname)
    console.log('🔵 [MIDDLEWARE] URL completa:', request.url)
    
    // Verificar cookies disponibles ANTES de intentar obtener la sesión
    const cookies = request.cookies.getAll()
    const cookieNames = cookies.map(c => c.name)
    console.log('🔵 [MIDDLEWARE] Total cookies:', cookies.length)
    console.log('🔵 [MIDDLEWARE] Cookies disponibles:', cookieNames.join(', '))
    
    // Buscar específicamente la cookie de auth de Supabase
    const authCookie = cookies.find(c => c.name.includes('auth-token'))
    console.log('🔵 [MIDDLEWARE] Cookie de auth encontrada:', authCookie ? 'Sí' : 'No')
    if (authCookie) {
      console.log('🔵 [MIDDLEWARE] Cookie de auth tiene valor:', authCookie.value ? 'Sí (longitud: ' + authCookie.value.length + ')' : 'No')
      if (authCookie.value) {
        console.log('🔵 [MIDDLEWARE] Primeros caracteres del token:', authCookie.value.substring(0, 50) + '...')
      }
    }
    
    // Verificar todas las cookies de Supabase
    const supabaseCookies = cookies.filter(c => c.name.startsWith('sb-'))
    console.log('🔵 [MIDDLEWARE] Total cookies de Supabase:', supabaseCookies.length)
    supabaseCookies.forEach(c => {
      console.log('  -', c.name, ':', c.value ? `Valor presente (${c.value.length} chars)` : 'Sin valor')
    })
    
    // Intentar obtener sesión primero
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('❌ [MIDDLEWARE] Error al obtener sesión:', sessionError.message)
      console.log('❌ [MIDDLEWARE] Error code:', sessionError.status)
    }
    
    console.log('🔵 [MIDDLEWARE] Sesión obtenida:', session ? 'Sí' : 'No')
    if (session) {
      console.log('🔵 [MIDDLEWARE] Sesión válida, expira en:', new Date(session.expires_at! * 1000).toISOString())
      console.log('🔵 [MIDDLEWARE] Usuario de la sesión:', session.user?.id)
    }
    
    // Ahora obtener el usuario (debería usar la sesión si está disponible)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('❌ [MIDDLEWARE] Error al obtener usuario:', userError.message)
      console.log('❌ [MIDDLEWARE] Error code:', userError.status)
    }
    
    console.log('🔵 [MIDDLEWARE] Usuario obtenido:', user ? { id: user.id, email: user.email } : 'null')
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/middleware.ts:87',message:'User check result',data:{hasUser:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    if (!user) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/middleware.ts:90',message:'Middleware redirecting to login',data:{pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.log('❌ [MIDDLEWARE] No hay usuario, redirigiendo a login')
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      console.log('🔵 [MIDDLEWARE] Redirigiendo a:', url.toString())
      console.log('🔵 [MIDDLEWARE] ==========================================\n')
      return NextResponse.redirect(url)
    }

    // Verificar si es super admin
    console.log('🔵 [MIDDLEWARE] Verificando rol super_admin para usuario:', user.id)
    const adminCheck = await isSuperAdmin(user.id)
    console.log('🔵 [MIDDLEWARE] Es super_admin?', adminCheck)

    if (!adminCheck) {
      console.log('❌ [MIDDLEWARE] Usuario no es super_admin, redirigiendo a home')
      console.log('🔵 [MIDDLEWARE] ==========================================\n')
      return NextResponse.redirect(new URL('/', request.url))
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/middleware.ts:112',message:'Middleware allowing access',data:{userId:user.id,isAdmin:adminCheck},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.log('✅ [MIDDLEWARE] Usuario autenticado y es super_admin, permitiendo acceso')
    console.log('🔵 [MIDDLEWARE] ==========================================\n')
    return supabaseResponse
  }

  return supabaseResponse
}

