import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getProfile } from '@/server-actions/user/profile'
import { SuperSidebar } from '@/components/super/sidebar'
import { SuperTopBar } from '@/components/super/top-bar'

export default async function SuperLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This will throw if not super_admin, causing redirect
  try {
    await requireSuperAdmin()
  } catch (error) {
    redirect('/login?redirect=/super')
  }

  let profile = null
  try {
    profile = await getProfile()
  } catch {
    // Profile might not exist yet
  }

  return (
    <div className="min-h-screen bg-background-default text-text-default">
      <SuperSidebar />
      <div className="lg:pl-64">
        <SuperTopBar
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
        <main className="p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
