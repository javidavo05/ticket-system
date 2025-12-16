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
  const { data: { user } } = await supabase.auth.getUser()

  // Admin routes require authentication
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    console.log('🔵 [MIDDLEWARE] Verificando acceso a ruta admin:', pathname)
    
    // Verificar cookies disponibles
    const cookies = request.cookies.getAll()
    console.log('🔵 [MIDDLEWARE] Cookies disponibles:', cookies.map(c => c.name).join(', '))
    console.log('🔵 [MIDDLEWARE] Usuario obtenido:', user ? { id: user.id, email: user.email } : 'null')

    if (!user) {
      console.log('❌ [MIDDLEWARE] No hay usuario, redirigiendo a login')
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Verificar si es super admin
    const adminCheck = await isSuperAdmin(user.id)
    console.log('🔵 [MIDDLEWARE] Es super_admin?', adminCheck)

    if (!adminCheck) {
      console.log('❌ [MIDDLEWARE] Usuario no es super_admin, redirigiendo a home')
      return NextResponse.redirect(new URL('/', request.url))
    }

    console.log('✅ [MIDDLEWARE] Usuario autenticado y es super_admin, permitiendo acceso')
    return supabaseResponse
  }

  return supabaseResponse
}

