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

  // Detect subdomain
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  const isSuperSubdomain = subdomain === 'super'

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          const cookies = request.cookies.getAll()
          // Log para debugging
          if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/super')) {
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
          if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/super')) {
            console.log('🔵 [MIDDLEWARE] setAll() llamado con', cookiesToSet.length, 'cookies')
          }
          // Actualizar cookies en el request
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          // Recrear la respuesta con las cookies actualizadas
          supabaseResponse = NextResponse.next({ request })
          // Aplicar todas las cookies a la respuesta
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              path: options?.path || '/',
              sameSite: options?.sameSite || 'lax',
              httpOnly: options?.httpOnly ?? false,
            })
          })
        },
      },
    }
  )

  // Super admin routes - subdomain detection and role validation
  if (isSuperSubdomain || pathname.startsWith('/super')) {
    console.log('\n🔴 [SUPER MIDDLEWARE] ==========================================')
    console.log('🔴 [SUPER MIDDLEWARE] Super admin route detected:', pathname)
    console.log('🔴 [SUPER MIDDLEWARE] Subdomain:', subdomain)
    console.log('🔴 [SUPER MIDDLEWARE] Hostname:', hostname)

    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('❌ [SUPER MIDDLEWARE] Error al obtener sesión:', sessionError.message)
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('❌ [SUPER MIDDLEWARE] Error al obtener usuario:', userError.message)
    }

    console.log('🔴 [SUPER MIDDLEWARE] Usuario:', user ? { id: user.id, email: user.email } : 'null')

    if (!user) {
      console.log('❌ [SUPER MIDDLEWARE] No hay usuario, redirigiendo a super login')
      const url = request.nextUrl.clone()
      url.pathname = '/super/login'
      url.searchParams.set('redirect', pathname)
      console.log('🔴 [SUPER MIDDLEWARE] ==========================================\n')
      return NextResponse.redirect(url)
    }

    // Validate super_admin role
    console.log('🔴 [SUPER MIDDLEWARE] Verificando rol super_admin para usuario:', user.id)
    const isSuper = await isSuperAdmin(user.id)
    console.log('🔴 [SUPER MIDDLEWARE] Es super_admin?', isSuper)

    if (!isSuper) {
      console.log('❌ [SUPER MIDDLEWARE] Acceso denegado - usuario no es super_admin')
      console.log('🔴 [SUPER MIDDLEWARE] Redirigiendo a home')
      console.log('🔴 [SUPER MIDDLEWARE] ==========================================\n')
      // Log access attempt
      // TODO: Add audit logging for denied access
      return NextResponse.redirect(new URL('/', request.url))
    }

    // If subdomain is 'super' but pathname doesn't start with /super, rewrite to /super
    if (isSuperSubdomain && !pathname.startsWith('/super')) {
      const url = request.nextUrl.clone()
      url.pathname = `/super${pathname === '/' ? '' : pathname}`
      console.log('🔴 [SUPER MIDDLEWARE] Rewriting to:', url.pathname)
      console.log('✅ [SUPER MIDDLEWARE] Acceso permitido - super_admin verificado')
      console.log('🔴 [SUPER MIDDLEWARE] ==========================================\n')
      return NextResponse.rewrite(url)
    }

    console.log('✅ [SUPER MIDDLEWARE] Acceso permitido - super_admin verificado')
    console.log('🔴 [SUPER MIDDLEWARE] ==========================================\n')
    return supabaseResponse
  }

  // Admin routes require authentication - verificar primero
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
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

    if (!user) {
      console.log('❌ [MIDDLEWARE] No hay usuario, redirigiendo a admin login')
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('redirect', pathname)
      console.log('🔵 [MIDDLEWARE] Redirigiendo a:', url.toString())
      console.log('🔵 [MIDDLEWARE] ==========================================\n')
      return NextResponse.redirect(url)
    }

    // Verificar si tiene algún rol de admin (no solo super_admin)
    // Admin panel es para: event_admin, accounting, scanner, promoter, super_admin
    const { hasRole } = await import('@/lib/supabase/rls')
    const { ROLES } = await import('@/lib/utils/constants')
    
    console.log('🔵 [MIDDLEWARE] Verificando roles de admin para usuario:', user.id)
    const isSuper = await isSuperAdmin(user.id)
    const isEventAdmin = await hasRole(user.id, ROLES.EVENT_ADMIN)
    const isAccounting = await hasRole(user.id, ROLES.ACCOUNTING)
    const isScanner = await hasRole(user.id, ROLES.SCANNER)
    const isPromoter = await hasRole(user.id, ROLES.PROMOTER)
    
    const hasAdminRole = isSuper || isEventAdmin || isAccounting || isScanner || isPromoter
    console.log('🔵 [MIDDLEWARE] Roles:', { isSuper, isEventAdmin, isAccounting, isScanner, isPromoter })

    if (!hasAdminRole) {
      console.log('❌ [MIDDLEWARE] Usuario no tiene rol de admin, redirigiendo a home')
      console.log('🔵 [MIDDLEWARE] ==========================================\n')
      return NextResponse.redirect(new URL('/', request.url))
    }

    console.log('✅ [MIDDLEWARE] Usuario autenticado con rol de admin, permitiendo acceso')
    console.log('🔵 [MIDDLEWARE] ==========================================\n')
    return supabaseResponse
  }

  return supabaseResponse
}

