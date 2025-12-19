import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { isSuperAdmin } from '@/lib/supabase/rls'
import { getProfile } from '@/server-actions/user/profile'
import { AdminSidebar } from '@/components/admin/sidebar'
import { AdminTopBar } from '@/components/admin/top-bar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/admin/login?redirect=/admin/dashboard')
  }

  // Verificar si el usuario es super admin
  const isSuper = await isSuperAdmin(user.id)

  let profile = null
  try {
    profile = await getProfile()
  } catch {
    // Profile might not exist yet
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AdminSidebar isSuperAdmin={isSuper} />
      <div className="lg:pl-64">
        <AdminTopBar
          user={
            profile
              ? {
                  email: profile.email,
                  fullName: profile.fullName,
                  profilePhotoUrl: profile.profilePhotoUrl,
                }
              : undefined
          }
        />
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

