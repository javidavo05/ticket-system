import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { isSuperAdmin } from '@/lib/supabase/rls'
import { getProfile } from '@/server-actions/user/profile'
import { updateProfile, changePassword } from '@/server-actions/user/profile'
import ProfileEditForm from './profile-edit-form'

export default async function ProfileEditPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/profile/edit')
  }

  // Super admins no tienen cuenta de tickets - redirigir a admin dashboard
  const isSuper = await isSuperAdmin(user.id)
  if (isSuper) {
    redirect('/admin/dashboard')
  }

  const profile = await getProfile()

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Editar Perfil</h1>

        <div className="bg-white shadow rounded-lg p-6">
          <ProfileEditForm initialData={profile} />
        </div>
      </div>
    </div>
  )
}

