import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getCurrentUser } from './permissions'

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin routes require authentication
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    console.log('🔵 [MIDDLEWARE] Verificando acceso a ruta admin:', pathname)
    
    const response = await updateSession(request)
    
    // Verificar cookies disponibles
    const cookies = request.cookies.getAll()
    console.log('🔵 [MIDDLEWARE] Cookies disponibles:', cookies.map(c => c.name).join(', '))
    
    const user = await getCurrentUser()
    console.log('🔵 [MIDDLEWARE] Usuario obtenido:', user ? { id: user.id, email: user.email } : 'null')

    if (!user) {
      console.log('❌ [MIDDLEWARE] No hay usuario, redirigiendo a login')
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    console.log('✅ [MIDDLEWARE] Usuario autenticado, permitiendo acceso')
    return response
  }

  return updateSession(request)
}

