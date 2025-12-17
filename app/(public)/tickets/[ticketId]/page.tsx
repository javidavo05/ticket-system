import { verifyTicketAccessToken } from '@/lib/services/tickets/secure-links'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateQRCodeImage } from '@/lib/services/tickets/qr'
import { format } from 'date-fns'
import { notFound, redirect } from 'next/navigation'

interface PageProps {
  params: { ticketId: string }
  searchParams: { token?: string }
}

export default async function TicketPage({ params, searchParams }: PageProps) {
  const { ticketId } = params
  const { token } = searchParams

  // Verify token
  if (!token) {
    redirect(`/tickets/${ticketId}?error=no_token`)
  }

  const tokenResult = await verifyTicketAccessToken(token)
  
  if (!tokenResult.valid) {
    if (tokenResult.expired) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Link Expired</h1>
            <p className="text-gray-600">
              This ticket link has expired. Please contact support or check your email for a new link.
            </p>
          </div>
        </div>
      )
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Link</h1>
          <p className="text-gray-600">
            This ticket link is invalid. Please check your email for the correct link.
          </p>
        </div>
      </div>
    )
  }

  // Verify ticket ID matches token
  if (tokenResult.ticketId !== ticketId) {
    notFound()
  }

  // Fetch ticket data
  const supabase = await createServiceRoleClient()
  type EventData = {
    id: string
    name: string
    start_date: string
    end_date: string
    location_name: string | null
    location_address: string | null
  }

  type TicketWithEvent = {
    id: string
    ticket_number: string
    purchaser_name: string
    purchaser_email: string
    qr_signature: string
    status: string
    events: EventData | EventData[] | null
  }

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      purchaser_name,
      purchaser_email,
      qr_signature,
      status,
      events!inner (
        id,
        name,
        start_date,
        end_date,
        location_name,
        location_address
      )
    `)
    .eq('id', ticketId)
    .single() as { data: TicketWithEvent | null; error: any }

  if (ticketError || !ticket) {
    notFound()
  }

  const event = Array.isArray(ticket.events) 
    ? ticket.events[0] 
    : ticket.events
  if (!event) {
    notFound()
  }

  // Generate QR code image
  const qrCodeImage = await generateQRCodeImage(ticket.qr_signature)

  // Format dates
  const startDate = format(new Date(event.start_date), 'EEEE, MMMM d, yyyy h:mm a')
  const endDate = format(new Date(event.end_date), 'EEEE, MMMM d, yyyy h:mm a')

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-black text-white px-6 py-4">
            <h1 className="text-2xl font-bold">Your Ticket</h1>
            <p className="text-gray-300">Thank you for your purchase!</p>
          </div>

          {/* Ticket Details */}
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h2>
              <div className="space-y-2 text-gray-600">
                <p>
                  <span className="font-semibold">Date:</span> {startDate}
                </p>
                {event.end_date && event.end_date !== event.start_date && (
                  <p>
                    <span className="font-semibold">Ends:</span> {endDate}
                  </p>
                )}
                <p>
                  <span className="font-semibold">Location:</span>{' '}
                  {event.location_address || event.location_name || 'TBA'}
                </p>
                <p>
                  <span className="font-semibold">Ticket Number:</span> {ticket.ticket_number}
                </p>
                <p>
                  <span className="font-semibold">Purchaser:</span> {ticket.purchaser_name}
                </p>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-center">
              <p className="text-sm text-gray-600 mb-4">
                Present this QR code at the event entrance
              </p>
              <div className="inline-block bg-white p-4 rounded-lg">
                <img
                  src={qrCodeImage}
                  alt="QR Code"
                  className="w-64 h-64 mx-auto"
                />
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-center mb-4">
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  ticket.status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : ticket.status === 'used'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {ticket.status === 'paid' && 'Valid'}
                {ticket.status === 'used' && 'Used'}
                {ticket.status === 'revoked' && 'Revoked'}
                {ticket.status === 'refunded' && 'Refunded'}
                {ticket.status === 'issued' && 'Issued'}
              </span>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Keep this page open or save the QR code image. 
                You will need to present it at the event entrance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

