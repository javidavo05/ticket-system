import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { NFCBindingScreen } from '@/components/nfc/binding-screen'

export default async function NFCBindPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/admin/login?redirect=/admin/nfc/bind')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <NFCBindingScreen />
      </div>
    </div>
  )
}
