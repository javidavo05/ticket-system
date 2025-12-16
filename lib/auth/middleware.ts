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
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError) {
    console.log('❌ [MIDDLEWARE] Error al obtener usuario:', userError.message)
  }

  // Admin routes require authentication
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    console.log('\n🔵 [MIDDLEWARE] ==========================================')
    console.log('🔵 [MIDDLEWARE] Verificando acceso a ruta admin:', pathname)
    console.log('🔵 [MIDDLEWARE] URL completa:', request.url)
    
    // Verificar cookies disponibles
    const cookies = request.cookies.getAll()
    const cookieNames = cookies.map(c => c.name)
    console.log('🔵 [MIDDLEWARE] Total cookies:', cookies.length)
    console.log('🔵 [MIDDLEWARE] Cookies disponibles:', cookieNames.join(', '))
    
    // Buscar específicamente la cookie de auth de Supabase
    const authCookie = cookies.find(c => c.name.includes('auth-token'))
    console.log('🔵 [MIDDLEWARE] Cookie de auth encontrada:', authCookie ? 'Sí' : 'No')
    if (authCookie) {
      console.log('🔵 [MIDDLEWARE] Cookie de auth tiene valor:', authCookie.value ? 'Sí (longitud: ' + authCookie.value.length + ')' : 'No')
    }
    
    console.log('🔵 [MIDDLEWARE] Usuario obtenido:', user ? { id: user.id, email: user.email } : 'null')

    if (!user) {
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

    console.log('✅ [MIDDLEWARE] Usuario autenticado y es super_admin, permitiendo acceso')
    console.log('🔵 [MIDDLEWARE] ==========================================\n')
    return supabaseResponse
  }

  return supabaseResponse
}

