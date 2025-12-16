import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getCurrentUser } from './permissions'

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin routes require authentication
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    const response = await updateSession(request)
    const user = await getCurrentUser()

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    return response
  }

  return updateSession(request)
}

