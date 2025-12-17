import { Resend } from 'resend'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
}

export interface EmailProvider {
  send(options: EmailOptions): Promise<{ success: boolean; messageId?: string }>
}

class BrevoProvider implements EmailProvider {
  private apiKey: string
  private baseUrl = 'https://api.brevo.com/v3'

  constructor() {
    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
      throw new Error('Brevo API key not configured')
    }
    this.apiKey = apiKey
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to]
      
      // Add timeout to request (30 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      try {
        const response = await fetch(`${this.baseUrl}/smtp/email`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: 'Sistema de Venta',
              email: options.from || process.env.EMAIL_FROM || 'noreply@sistemadeventa.com',
            },
            to: recipients.map(email => ({ email })),
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }))
          
          // Detect rate limiting
          if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.')
          }
          
          // Detect permanent errors
          if (response.status === 400 || response.status === 422) {
            const errorMessage = errorData.message || errorData.error || response.statusText
            throw new Error(`Invalid request: ${errorMessage}`)
          }
          
          throw new Error(`Brevo API error: ${errorData.message || response.statusText}`)
        }

        const result = await response.json()

        return {
          success: true,
          messageId: result.messageId,
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout. The email service may be slow or unavailable.')
        }
        
        throw fetchError
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Email send error:', errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}

class ResendProvider implements EmailProvider {
  private client: Resend

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('Resend API key not configured')
    }
    this.client = new Resend(apiKey)
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await this.client.emails.send({
        from: options.from || process.env.EMAIL_FROM || 'noreply@sistemadeventa.com',
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      return {
        success: true,
        messageId: result.id,
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      console.error('Email send error:', errorMessage)
      
      // Detect rate limiting
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        }
      }
      
      // Detect permanent errors
      if (errorMessage.includes('invalid') || errorMessage.includes('bounced') || errorMessage.includes('blocked')) {
        return {
          success: false,
          error: errorMessage,
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}

class SendGridProvider implements EmailProvider {
  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
    // TODO: Implement SendGrid provider
    throw new Error('SendGrid provider not implemented')
  }
}

class SESProvider implements EmailProvider {
  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
    // TODO: Implement AWS SES provider
    throw new Error('AWS SES provider not implemented')
  }
}

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || 'brevo'

  switch (provider) {
    case 'brevo':
      return new BrevoProvider()
    case 'resend':
      return new ResendProvider()
    case 'sendgrid':
      return new SendGridProvider()
    case 'ses':
      return new SESProvider()
    default:
      throw new Error(`Unknown email provider: ${provider}`)
  }
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
  const provider = getEmailProvider()
  return provider.send(options)
}

