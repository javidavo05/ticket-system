/**
 * Base template system for emails
 * Provides a logical template structure without hardcoded HTML
 */

export interface EmailTemplate<T> {
  subject: (data: T) => string
  html: (data: T) => string
  text: (data: T) => string
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

/**
 * Render an email template with data
 */
export function renderTemplate<T>(
  template: EmailTemplate<T>,
  data: T
): RenderedEmail {
  return {
    subject: template.subject(data),
    html: template.html(data),
    text: template.text(data),
  }
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Format date for email display
 */
export function formatEmailDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

