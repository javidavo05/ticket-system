import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getPlatformSettings } from '@/server-actions/super/platform/get-settings'
import { updatePlatformSettings } from '@/server-actions/super/platform/update-settings'
import { PlatformSettingsForm } from '@/components/super/platform/platform-settings-form'

export default async function PlatformSettingsPage() {
  await requireSuperAdmin()

  const settings = await getPlatformSettings()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Global Platform Settings</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Configure platform-wide defaults and feature flags
        </p>
      </div>

      <PlatformSettingsForm initialSettings={settings} />
    </div>
  )
}
