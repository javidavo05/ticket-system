import { requireSuperAdmin } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TicketRulesForm } from '@/components/super/events/ticket-rules-form'

export default async function TicketRulesPage() {
  await requireSuperAdmin()

  // TODO: Fetch actual rules from database
  const rules = {
    multiDayPolicies: {
      allowCrossDay: true,
      requireSameEvent: true,
    },
    scanValidation: {
      maxScansPerTicket: 1,
      allowReentry: false,
    },
    refundPolicies: {
      allowRefunds: true,
      refundWindow: 7, // days
    },
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Ticket Rules</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Configure ticket validation and refund policies
        </p>
      </div>

      <TicketRulesForm initialRules={rules} />
    </div>
  )
}
