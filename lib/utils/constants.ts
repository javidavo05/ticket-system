export const APP_NAME = 'Sistema de Venta'

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  EVENT_ADMIN: 'event_admin',
  ACCOUNTING: 'accounting',
  SCANNER: 'scanner',
  PROMOTER: 'promoter',
} as const

export const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  LIVE: 'live',
  ENDED: 'ended',
  ARCHIVED: 'archived',
} as const

export const TICKET_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  USED: 'used',
  REVOKED: 'revoked',
  REFUNDED: 'refunded',
} as const

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const

export const PAYMENT_PROVIDERS = {
  YAPPY: 'yappy',
  PAGUELOFACIL: 'paguelofacil',
  BANK_TRANSFER: 'bank_transfer',
  WALLET: 'wallet',
} as const

export const DEFAULT_CURRENCY = 'USD'

export const QR_CODE_EXPIRY_HOURS = 24 * 30 // 30 days

export const MAX_TICKET_QUANTITY_PER_PURCHASE = 10

export const RATE_LIMIT = {
  PURCHASE: { requests: 10, window: 60 }, // 10 requests per minute
  SCAN: { requests: 100, window: 60 }, // 100 scans per minute
  API: { requests: 100, window: 60 }, // 100 API calls per minute
} as const

