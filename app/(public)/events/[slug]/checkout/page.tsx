'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { purchaseTickets } from '@/server-actions/tickets/purchase'

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ticketTypeId = searchParams.get('ticketType')

  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guestEmail, setGuestEmail] = useState('')
  const [guestName, setGuestName] = useState('')
  const [isGuest, setIsGuest] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('eventId', params.slug)
      formData.append('ticketTypeId', ticketTypeId || '')
      formData.append('quantity', quantity.toString())
      
      if (isGuest) {
        formData.append('guestEmail', guestEmail)
        formData.append('guestName', guestName)
      }

      const result = await purchaseTickets(formData)

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl
      } else if (result.paymentUrl) {
        window.location.href = result.paymentUrl
      } else {
        router.push(`/tickets/success?payment=${result.paymentId}`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process purchase')
    } finally {
      setLoading(false)
    }
  }

  if (!ticketTypeId) {
    return <div className="container mx-auto px-4 py-8">Invalid ticket type</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Quantity</label>
          <input
            type="number"
            min="1"
            max="10"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
            className="w-full px-4 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isGuest}
              onChange={(e) => setIsGuest(e.target.checked)}
            />
            <span>Checkout as guest</span>
          </label>
        </div>

        {isGuest && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded"
                required={isGuest}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-4 py-2 border rounded"
                required={isGuest}
              />
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white px-6 py-3 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Continue to Payment'}
        </button>
      </form>
    </div>
  )
}

