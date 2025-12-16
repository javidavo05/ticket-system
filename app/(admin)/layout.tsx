import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { isSuperAdmin } from '@/lib/supabase/rls'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log('🔵 [ADMIN LAYOUT] ==========================================')
  console.log('🔵 [ADMIN LAYOUT] AdminLayout entry - START')
  try {
    console.log('🔵 [ADMIN LAYOUT] Verificando acceso...')
    
    const user = await getCurrentUser()
    console.log('🔵 [ADMIN LAYOUT] Usuario obtenido:', user ? { id: user.id, email: user.email } : 'null')

    if (!user) {
      console.log('❌ [ADMIN LAYOUT] No hay usuario, redirigiendo a login')
      redirect('/login')
    }

    console.log('🔵 [ADMIN LAYOUT] Verificando rol super_admin para usuario:', user.id)
    const isAdmin = await isSuperAdmin(user.id)
    console.log('🔵 [ADMIN LAYOUT] Es super_admin?', isAdmin)

    if (!isAdmin) {
      console.log('❌ [ADMIN LAYOUT] Usuario no es super_admin, redirigiendo a home')
      redirect('/')
    }

    console.log('✅ [ADMIN LAYOUT] Acceso permitido, renderizando layout')

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
    console.error('❌ [ADMIN LAYOUT] ==========================================')
    console.error('❌ [ADMIN LAYOUT] Error capturado:', error)
    console.error('❌ [ADMIN LAYOUT] Error message:', error?.message)
    console.error('❌ [ADMIN LAYOUT] Error stack:', error?.stack)
    console.error('❌ [ADMIN LAYOUT] ==========================================')
    throw error
  }
}

