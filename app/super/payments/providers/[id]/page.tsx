import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getPaymentProvider } from '@/server-actions/super/payments/get-provider'
import { PaymentProviderForm } from '@/components/super/payments/payment-provider-form'
import { notFound } from 'next/navigation'

export default async function PaymentProviderPage({
  params,
}: {
  params: { id: string }
}) {
  await requireSuperAdmin()

  let provider
  try {
    provider = await getPaymentProvider(params.id)
  } catch (error) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Payment Provider</h1>
        <p className="text-xs text-text-muted mt-0.5">{provider.name}</p>
      </div>

      <PaymentProviderForm provider={provider} />
    </div>
  )
}
