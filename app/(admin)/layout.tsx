import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { isSuperAdmin } from '@/lib/supabase/rls'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(admin)/layout.tsx:11',message:'AdminLayout entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.log('🔵 [ADMIN LAYOUT] Verificando acceso...')
    
    const user = await getCurrentUser()
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(admin)/layout.tsx:15',message:'User obtained',data:{hasUser:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  console.log('🔵 [ADMIN LAYOUT] Usuario obtenido:', user ? { id: user.id, email: user.email } : 'null')

  if (!user) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(admin)/layout.tsx:19',message:'Redirecting to login - no user',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.log('❌ [ADMIN LAYOUT] No hay usuario, redirigiendo a login')
    redirect('/login')
  }

  console.log('🔵 [ADMIN LAYOUT] Verificando rol super_admin para usuario:', user.id)
  const isAdmin = await isSuperAdmin(user.id)
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(admin)/layout.tsx:25',message:'Admin check result',data:{isAdmin,userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  console.log('🔵 [ADMIN LAYOUT] Es super_admin?', isAdmin)

  if (!isAdmin) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(admin)/layout.tsx:29',message:'Redirecting to home - not admin',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.log('❌ [ADMIN LAYOUT] Usuario no es super_admin, redirigiendo a home')
    redirect('/')
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(admin)/layout.tsx:33',message:'Layout rendering children',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  console.log('✅ [ADMIN LAYOUT] Acceso permitido')

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    )
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(admin)/layout.tsx:62',message:'Layout error caught',data:{errorMessage:error?.message,errorName:error?.name,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('❌ [ADMIN LAYOUT] Error:', error)
    throw error
  }
}

