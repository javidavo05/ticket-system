import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileSettings } from '@/components/admin/settings/profile-settings'
import { SecuritySettings } from '@/components/admin/settings/security-settings'
import { UsersManagement } from '@/components/admin/settings/users-management'
import { AccountingSettings } from '@/components/admin/settings/accounting-settings'
import { PreferencesSettings } from '@/components/admin/settings/preferences-settings'
import { User, Lock, Users, DollarSign, Settings as SettingsIcon } from 'lucide-react'

export default async function AdminSettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/admin/login?redirect=/admin/settings')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Configuración
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gestiona todas las configuraciones del sistema
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Seguridad</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="accounting" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Contabilidad</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Preferencias</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="accounting" className="space-y-4">
          <AccountingSettings />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <PreferencesSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

