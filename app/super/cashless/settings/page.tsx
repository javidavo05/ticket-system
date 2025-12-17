import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getCashlessSettings } from '@/server-actions/super/cashless/get-settings'
import { CashlessSettingsForm } from '@/components/super/cashless/cashless-settings-form'

export default async function CashlessSettingsPage() {
  await requireSuperAdmin()

  const settings = await getCashlessSettings()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Cashless System Configuration</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Configure wallet and cashless system settings
        </p>
      </div>

      <CashlessSettingsForm initialSettings={settings} />
    </div>
  )
}
