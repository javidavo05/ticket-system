import { sendEmail } from '../client'

export interface TicketEmailData {
  ticketNumber: string
  eventName: string
  eventDate: string
  eventLocation: string
  purchaserName: string
  qrCodeImage: string
  ticketUrl: string
}

export async function sendTicketEmail(
  to: string,
  data: TicketEmailData
): Promise<{ success: boolean; messageId?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Ticket - ${data.eventName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <h1 style="color: #000; margin-top: 0;">Your Ticket</h1>
          <p>Hello ${data.purchaserName},</p>
          <p>Thank you for your purchase! Your ticket for <strong>${data.eventName}</strong> is attached below.</p>
        </div>

        <div style="background: white; border: 2px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #000; margin-top: 0;">${data.eventName}</h2>
          <p><strong>Date:</strong> ${data.eventDate}</p>
          <p><strong>Location:</strong> ${data.eventLocation}</p>
          <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
          
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
  `

  const text = `
Your Ticket - ${data.eventName}

Hello ${data.purchaserName},

Thank you for your purchase! Your ticket details:

Event: ${data.eventName}
Date: ${data.eventDate}
Location: ${data.eventLocation}
Ticket Number: ${data.ticketNumber}

View your ticket online: ${data.ticketUrl}

Please present the QR code at the event entrance.
  `

  return sendEmail({
    to,
    subject: `Your Ticket - ${data.eventName}`,
    html,
    text,
  })
}

