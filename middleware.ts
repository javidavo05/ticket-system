import { type NextRequest } from 'next/server'
import { authMiddleware } from '@/lib/auth/middleware'

export async function middleware(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:5',message:'Middleware entry',data:{pathname:request.nextUrl.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const result = await authMiddleware(request)
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:9',message:'Middleware exit',data:{status:result.status,type:result.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  return result
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

