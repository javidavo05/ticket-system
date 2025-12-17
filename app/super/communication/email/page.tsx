import { requireSuperAdmin } from '@/lib/auth/permissions'
import { EmailSettingsForm } from '@/components/super/communication/email-settings-form'

export default async function EmailSettingsPage() {
  await requireSuperAdmin()

  // TODO: Fetch actual email settings from database
  const settings = {
    provider: 'smtp',
    sender: {
      name: 'Sistema de Eventa',
      email: 'noreply@sistemadeventa.com',
    },
    retryPolicies: {
      maxRetries: 3,
      backoff: 'exponential',
    },
    throttling: {
      maxPerMinute: 60,
      maxPerHour: 1000,
    },
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Email Provider Configuration</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Configure email delivery settings and retry policies
        </p>
      </div>

      <EmailSettingsForm initialSettings={settings} />
    </div>
  )
}
