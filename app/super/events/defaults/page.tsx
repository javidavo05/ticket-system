import { requireSuperAdmin } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventDefaultsForm } from '@/components/super/events/event-defaults-form'

export default async function EventDefaultsPage() {
  await requireSuperAdmin()

  // TODO: Fetch actual defaults from database
  const defaults = {
    defaultTicketTypes: ['General Admission', 'VIP'],
    defaultPricingRules: {
      currency: 'USD',
      taxRate: 0.1,
    },
    defaultValidationRules: {
      allowMultipleScans: false,
      requireIdentity: false,
    },
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Event Defaults</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Configure default settings for new events
        </p>
      </div>

      <EventDefaultsForm initialDefaults={defaults} />
    </div>
  )
}
