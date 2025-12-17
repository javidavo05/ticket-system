import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getNFCSettings } from '@/server-actions/super/cashless/get-nfc-settings'
import { NFCSettingsForm } from '@/components/super/cashless/nfc-settings-form'

export default async function NFCSettingsPage() {
  await requireSuperAdmin()

  const settings = await getNFCSettings()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">NFC System Configuration</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Configure NFC band management and security settings
        </p>
      </div>

      <NFCSettingsForm initialSettings={settings} />
    </div>
  )
}
