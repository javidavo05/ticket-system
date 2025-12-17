import { sendEmailWithTracking } from '../delivery'
import { sendEmail } from '../client'
import { renderTemplate, type EmailTemplate, escapeHtml } from './base'
import { generateQRCodeImage } from '@/lib/services/tickets/qr'
import { generateTicketUrl } from '@/lib/services/tickets/secure-links'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export interface TicketEmailData {
  ticketNumber: string
  eventName: string
  eventDate: string
  eventLocation: string
  purchaserName: string
  qrCodeImage: string
  ticketUrl: string
}

/**
 * Get the ticket email template
 */
export function getTicketEmailTemplate(): EmailTemplate<TicketEmailData> {
  return {
    subject: (data) => `Your Ticket - ${data.eventName}`,
    
    html: (data) => {
      const safeEventName = escapeHtml(data.eventName)
      const safePurchaserName = escapeHtml(data.purchaserName)
      const safeEventDate = escapeHtml(data.eventDate)
      const safeEventLocation = escapeHtml(data.eventLocation)
      const safeTicketNumber = escapeHtml(data.ticketNumber)
      
      return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Ticket - ${safeEventName}</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
      <h1 style="color: #000; margin-top: 0;">Your Ticket</h1>
      <p>Hello ${safePurchaserName},</p>
      <p>Thank you for your purchase! Your ticket for <strong>${safeEventName}</strong> is attached below.</p>
    </div>

    <div style="background: white; border: 2px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
      <h2 style="color: #000; margin-top: 0;">${safeEventName}</h2>
      <p><strong>Date:</strong> ${safeEventDate}</p>
      <p><strong>Location:</strong> ${safeEventLocation}</p>
      <p><strong>Ticket Number:</strong> ${safeTicketNumber}</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <img src="${data.qrCodeImage}" alt="QR Code" style="max-width: 300px; height: auto;">
      </div>

      <p style="text-align: center;">
        <a href="${data.ticketUrl}" style="display: inline-block; background: #000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Ticket Online
        </a>
      </p>
    </div>

    <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; font-size: 12px; color: #666;">
      <p style="margin: 0;">Please present this QR code at the event entrance. Keep this email safe!</p>
    </div>
  </body>
</html>
      `.trim()
    },
    
    text: (data) => {
      return `
Your Ticket - ${data.eventName}

Hello ${data.purchaserName},

Thank you for your purchase! Your ticket details:

Event: ${data.eventName}
Date: ${data.eventDate}
Location: ${data.eventLocation}
Ticket Number: ${data.ticketNumber}

View your ticket online: ${data.ticketUrl}

Please present the QR code at the event entrance.
      `.trim()
    },
  }
}

/**
 * Send ticket delivery email with full tracking and idempotency
 */
export async function sendTicketDeliveryEmail(
  ticketId: string,
  idempotencyKey?: string
): Promise<{ success: boolean; deliveryId?: string; messageId?: string; error?: string }> {
  const supabase = await createServiceRoleClient()

  // Fetch ticket and related data
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      purchaser_email,
      purchaser_name,
      qr_signature,
      event_id,
      organization_id,
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
    .single()

  if (ticketError || !ticket) {
    throw new Error(`Ticket not found: ${ticketId}`)
  }

  const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events
  if (!event) {
    throw new Error(`Event not found for ticket: ${ticketId}`)
  }

  // Generate QR code image
  const qrCodeImage = await generateQRCodeImage(ticket.qr_signature)

  // Generate secure ticket URL
  const ticketUrl = await generateTicketUrl(ticketId)

  // Format event date
  const eventDate = format(new Date(event.start_date), 'EEEE, MMMM d, yyyy h:mm a')

  // Prepare template data
  const templateData: TicketEmailData = {
    ticketNumber: ticket.ticket_number,
    eventName: event.name,
    eventDate: eventDate,
    eventLocation: event.location_address || event.location_name || 'TBA',
    purchaserName: ticket.purchaser_name,
    qrCodeImage,
    ticketUrl,
  }

  // Render template
  const template = getTicketEmailTemplate()
  const rendered = renderTemplate(template, templateData)

  // Send email with tracking
  // Store email content in metadata for retry purposes
  const result = await sendEmailWithTracking({
    emailType: 'ticket_delivery',
    to: ticket.purchaser_email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    recipientName: ticket.purchaser_name,
    resourceType: 'ticket',
    resourceId: ticketId,
    organizationId: ticket.organization_id || undefined,
    metadata: {
      ticketNumber: ticket.ticket_number,
      eventName: event.name,
      eventId: event.id,
      // Store email content for retry
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    },
    idempotencyKey,
  })

  return {
    success: result.success,
    deliveryId: result.deliveryId,
    messageId: result.messageId,
    error: result.error,
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use sendTicketDeliveryEmail instead
 */
export async function sendTicketEmail(
  to: string,
  data: TicketEmailData
): Promise<{ success: boolean; messageId?: string }> {
  const template = getTicketEmailTemplate()
  const rendered = renderTemplate(template, data)

  return sendEmail({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  })
}

