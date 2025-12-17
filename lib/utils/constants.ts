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
  ISSUED: 'issued',
  PAID: 'paid',
  USED: 'used',
  REVOKED: 'revoked',
  REFUNDED: 'refunded',
} as const

export const TICKET_RULE_TYPES = {
  SCAN_LIMIT: 'scan_limit',
  TIME_WINDOW: 'time_window',
  ZONE_RESTRICTION: 'zone_restriction',
  MULTI_DAY_ACCESS: 'multi_day_access',
  DATE_RANGE: 'date_range',
} as const

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
} as const

export const PAYMENT_TRANSACTION_TYPE = {
  PAYMENT: 'payment',
  REFUND: 'refund',
  ADJUSTMENT: 'adjustment',
} as const

export const PAYMENT_TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
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

