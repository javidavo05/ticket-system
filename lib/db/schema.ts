import { pgTable, uuid, text, timestamp, numeric, integer, boolean, jsonb, pgEnum, inet, date, bigserial, bigint, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Email delivery enums
export const emailDeliveryStatusEnum = pgEnum('email_delivery_status', ['pending', 'sent', 'failed', 'retrying'])
export const emailTypeEnum = pgEnum('email_type', ['ticket_delivery', 'payment_confirmation', 'password_reset', 'email_verification', 'other'])

// Enums
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'event_admin', 'accounting', 'scanner', 'promoter'])
export const eventTypeEnum = pgEnum('event_type', ['concert', 'festival', 'conference', 'sports', 'theater', 'other'])
export const eventStatusEnum = pgEnum('event_status', ['draft', 'published', 'live', 'ended', 'archived'])
export const ticketStatusEnum = pgEnum('ticket_status', ['pending_payment', 'issued', 'paid', 'used', 'revoked', 'refunded'])
export const scanMethodEnum = pgEnum('scan_method', ['qr', 'nfc', 'manual'])
export const paymentProviderEnum = pgEnum('payment_provider', ['yappy', 'paguelofacil', 'bank_transfer', 'wallet'])
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'])
export const paymentTransactionTypeEnum = pgEnum('payment_transaction_type', ['payment', 'refund', 'adjustment'])
export const paymentTransactionStatusEnum = pgEnum('payment_transaction_status', ['pending', 'completed', 'failed'])
export const paymentMethodEnum = pgEnum('payment_method', ['card', 'transfer', 'qr', 'wallet'])
export const itemTypeEnum = pgEnum('item_type', ['ticket', 'wallet_reload', 'refund'])
export const transactionTypeEnum = pgEnum('transaction_type', ['credit', 'debit'])
export const referenceTypeEnum = pgEnum('reference_type', ['payment', 'reload', 'refund', 'purchase', 'transfer'])
export const nfcBandStatusEnum = pgEnum('nfc_band_status', ['active', 'lost', 'deactivated'])
export const nfcTransactionTypeEnum = pgEnum('nfc_transaction_type', ['payment', 'access_control'])
export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed_amount'])

// Organizations (tenants)
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  domain: text('domain'),
  logoUrl: text('logo_url'),
  settings: jsonb('settings').default({}).notNull(),
  subscriptionTier: text('subscription_tier').default('free').notNull(),
  maxEvents: integer('max_events'),
  maxUsers: integer('max_users'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// Event locations
export const eventLocations = pgTable('event_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  country: text('country').notNull(),
  postalCode: text('postal_code'),
  coordinates: text('coordinates'), // PostgreSQL point type stored as text
  capacity: integer('capacity'),
  facilities: jsonb('facilities').default({}).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  phone: text('phone'),
  nationalId: text('national_id'), // Encrypted at application level
  profilePhotoUrl: text('profile_photo_url'),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  walletBalance: numeric('wallet_balance', { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// User roles
export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: userRoleEnum('role').notNull(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Events
// @ts-ignore - Circular reference with themes, resolved at runtime
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  eventType: eventTypeEnum('event_type'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  isMultiDay: boolean('is_multi_day').default(false).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => eventLocations.id),
  locationName: text('location_name'), // Keep for backward compatibility
  locationAddress: text('location_address'), // Keep for backward compatibility
  locationCoordinates: text('location_coordinates'), // Keep for backward compatibility, PostgreSQL point type stored as text
  themeId: uuid('theme_id').references((): any => themes.id as any),
  status: eventStatusEnum('status').default('draft').notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// Themes
// @ts-ignore - Circular reference with events, resolved at runtime
export const themes = pgTable('themes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  eventId: uuid('event_id').references((): any => events.id as any, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  config: jsonb('config').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  version: integer('version').default(1).notNull(),
  versionHash: text('version_hash'),
  schemaVersion: text('schema_version').default('1.0.0').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  parentThemeId: uuid('parent_theme_id').references(() => themes.id, { onDelete: 'set null' }),
  cacheKey: text('cache_key').notNull().unique(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  deprecatedAt: timestamp('deprecated_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Theme versions
export const themeVersions = pgTable('theme_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  themeId: uuid('theme_id').references(() => themes.id, { onDelete: 'cascade' }).notNull(),
  version: integer('version').notNull(),
  config: jsonb('config').notNull(),
  versionHash: text('version_hash').notNull(),
  schemaVersion: text('schema_version').default('1.0.0').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueThemeVersion: unique().on(table.themeId, table.version),
}))

// Theme cache tags
export const themeCacheTags = pgTable('theme_cache_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  themeId: uuid('theme_id').references(() => themes.id, { onDelete: 'cascade' }).notNull(),
  tag: text('tag').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueThemeTag: unique().on(table.themeId, table.tag),
}))

// Theme assets
export const themeAssets = pgTable('theme_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  themeId: uuid('theme_id').references(() => themes.id, { onDelete: 'cascade' }).notNull(),
  assetType: text('asset_type').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  fileData: text('file_data').notNull(), // PostgreSQL bytea type stored as text
  url: text('url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueThemeAssetType: unique().on(table.themeId, table.assetType),
}))

// Ticket types
export const ticketTypes = pgTable('ticket_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  quantityAvailable: integer('quantity_available').notNull(),
  quantitySold: integer('quantity_sold').default(0).notNull(),
  maxPerPurchase: integer('max_per_purchase'),
  isMultiScan: boolean('is_multi_scan').default(false).notNull(),
  maxScans: integer('max_scans'),
  saleStart: timestamp('sale_start', { withTimezone: true }),
  saleEnd: timestamp('sale_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Ticket usage rules
export const ticketUsageRules = pgTable('ticket_usage_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketTypeId: uuid('ticket_type_id').references(() => ticketTypes.id, { onDelete: 'cascade' }).notNull(),
  ruleType: text('rule_type').notNull(),
  ruleConfig: jsonb('rule_config').notNull(),
  priority: integer('priority').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Tickets
export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketNumber: text('ticket_number').notNull().unique(),
  ticketTypeId: uuid('ticket_type_id').references(() => ticketTypes.id).notNull(),
  eventId: uuid('event_id').references(() => events.id).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  purchaserId: uuid('purchaser_id').references(() => users.id),
  purchaserEmail: text('purchaser_email').notNull(),
  purchaserName: text('purchaser_name').notNull(),
  qrSignature: text('qr_signature').notNull(),
  qrPayload: jsonb('qr_payload').notNull(),
  status: ticketStatusEnum('status').default('pending_payment').notNull(),
  paymentId: uuid('payment_id').references(() => payments.id),
  promoterId: uuid('promoter_id').references(() => users.id),
  ticketGroupId: uuid('ticket_group_id').references(() => ticketGroups.id, { onDelete: 'set null' }),
  assignedToEmail: text('assigned_to_email'),
  assignedToName: text('assigned_to_name'),
  scanCount: integer('scan_count').default(0).notNull(),
  firstScanAt: timestamp('first_scan_at', { withTimezone: true }),
  lastScanAt: timestamp('last_scan_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedBy: uuid('revoked_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Ticket groups (for promoter-based group sales)
export const ticketGroups = pgTable('ticket_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  ticketTypeId: uuid('ticket_type_id').references(() => ticketTypes.id, { onDelete: 'cascade' }).notNull(),
  promoterId: uuid('promoter_id').references(() => users.id).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  groupName: text('group_name'),
  totalTickets: integer('total_tickets').notNull(),
  ticketsAssigned: integer('tickets_assigned').default(0).notNull(),
  ticketsSold: integer('tickets_sold').default(0).notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).default('0').notNull(),
  allowsPartial: boolean('allows_partial').default(true).notNull(),
  minPartialAmount: numeric('min_partial_amount', { precision: 10, scale: 2 }),
  paymentId: uuid('payment_id').references(() => payments.id),
  status: text('status').default('pending').notNull(), // pending, active, completed, cancelled
  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: uuid('cancelled_by').references(() => users.id),
  cancellationReason: text('cancellation_reason'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Ticket assignments (for detailed tracking of ticket assignments)
export const ticketAssignments = pgTable('ticket_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
  ticketGroupId: uuid('ticket_group_id').references(() => ticketGroups.id, { onDelete: 'cascade' }),
  promoterId: uuid('promoter_id').references(() => users.id).notNull(),
  assignedToEmail: text('assigned_to_email'),
  assignedToName: text('assigned_to_name'),
  assignedToPhone: text('assigned_to_phone'),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  assignedBy: uuid('assigned_by').references(() => users.id).notNull(),
  status: text('status').default('assigned').notNull(), // assigned, confirmed, cancelled
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Ticket nonces (for replay attack prevention)
export const ticketNonces = pgTable('ticket_nonces', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
  nonce: text('nonce').notNull(),
  scanId: uuid('scan_id').references(() => ticketScans.id, { onDelete: 'set null' }),
  usedAt: timestamp('used_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Ticket scans
export const ticketScans = pgTable('ticket_scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
  scannedBy: uuid('scanned_by').references(() => users.id).notNull(),
  scanLocation: text('scan_location'), // PostgreSQL point type stored as text
  scanMethod: scanMethodEnum('scan_method').notNull(),
  isValid: boolean('is_valid').notNull(),
  rejectionReason: text('rejection_reason'),
  deviceInfo: jsonb('device_info'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Payments
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  userId: uuid('user_id').references(() => users.id),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).default('0').notNull(),
  currency: text('currency').default('USD').notNull(),
  provider: paymentProviderEnum('provider').notNull(),
  providerPaymentId: text('provider_payment_id'),
  status: paymentStatusEnum('status').default('pending').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  allowsPartial: boolean('allows_partial').default(false).notNull(),
  minPartialAmount: numeric('min_partial_amount', { precision: 10, scale: 2 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: uuid('cancelled_by').references(() => users.id),
  cancellationReason: text('cancellation_reason'),
  metadata: jsonb('metadata'),
  webhookReceivedAt: timestamp('webhook_received_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Payment items
export const paymentItems = pgTable('payment_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'cascade' }).notNull(),
  ticketId: uuid('ticket_id').references(() => tickets.id),
  itemType: itemTypeEnum('item_type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Wallets
export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  balance: numeric('balance', { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Composite unique constraint: one wallet per user per event (or global if event_id is null)
  userEventUnique: unique().on(table.userId, table.eventId),
}))

// Wallet transactions
export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').references(() => wallets.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  transactionType: transactionTypeEnum('transaction_type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  balanceAfter: numeric('balance_after', { precision: 10, scale: 2 }).notNull(),
  referenceType: referenceTypeEnum('reference_type').notNull(),
  referenceId: uuid('reference_id'),
  description: text('description').notNull(),
  eventId: uuid('event_id').references(() => events.id),
  idempotencyKey: text('idempotency_key').unique(),
  sequenceNumber: bigserial('sequence_number', { mode: 'number' }).notNull(),
  metadata: jsonb('metadata').default({}),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// NFC bands
export const nfcBands = pgTable('nfc_bands', {
  id: uuid('id').primaryKey().defaultRandom(),
  bandUid: text('band_uid').notNull().unique(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').references(() => events.id),
  registeredBy: uuid('registered_by').references(() => users.id).notNull(),
  registeredAt: timestamp('registered_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  status: nfcBandStatusEnum('status').default('active').notNull(),
  metadata: jsonb('metadata'),
  securityToken: text('security_token').unique(),
  tokenIssuedAt: timestamp('token_issued_at', { withTimezone: true }),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  bindingVerifiedAt: timestamp('binding_verified_at', { withTimezone: true }),
  lastLocation: text('last_location'), // PostgreSQL point type stored as text
  concurrentUseCount: integer('concurrent_use_count').default(0).notNull(),
  maxConcurrentUses: integer('max_concurrent_uses').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// NFC transactions
export const nfcTransactions = pgTable('nfc_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  nfcBandId: uuid('nfc_band_id').references(() => nfcBands.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').references(() => events.id).notNull(),
  transactionType: nfcTransactionTypeEnum('transaction_type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }),
  zoneId: text('zone_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// NFC nonces (for replay attack prevention)
export const nfcNonces = pgTable('nfc_nonces', {
  id: uuid('id').primaryKey().defaultRandom(),
  nfcBandId: uuid('nfc_band_id').references(() => nfcBands.id, { onDelete: 'cascade' }).notNull(),
  nonce: text('nonce').notNull(),
  transactionId: uuid('transaction_id').references(() => nfcTransactions.id, { onDelete: 'set null' }),
  usedAt: timestamp('used_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueBandNonce: unique().on(table.nfcBandId, table.nonce),
}))

// NFC usage sessions (for cloning detection)
export const nfcUsageSessions = pgTable('nfc_usage_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  nfcBandId: uuid('nfc_band_id').references(() => nfcBands.id, { onDelete: 'cascade' }).notNull(),
  sessionToken: text('session_token').notNull().unique(),
  location: text('location'), // PostgreSQL point type stored as text
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  transactionCount: integer('transaction_count').default(0).notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// NFC rate limits
export const nfcRateLimits = pgTable('nfc_rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  nfcBandId: uuid('nfc_band_id').references(() => nfcBands.id, { onDelete: 'cascade' }).notNull().unique(),
  windowStart: timestamp('window_start', { withTimezone: true }).defaultNow().notNull(),
  requestCount: integer('request_count').default(0).notNull(),
  maxRequests: integer('max_requests').default(10).notNull(),
  windowDurationSeconds: integer('window_duration_seconds').default(60).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Discounts
export const discounts = pgTable('discounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  discountType: discountTypeEnum('discount_type').notNull(),
  discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
  maxUses: integer('max_uses'),
  usesCount: integer('uses_count').default(0).notNull(),
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  minPurchaseAmount: numeric('min_purchase_amount', { precision: 10, scale: 2 }),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Discount usage
export const discountUsage = pgTable('discount_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  discountId: uuid('discount_id').references(() => discounts.id).notNull(),
  paymentId: uuid('payment_id').references(() => payments.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  usedAt: timestamp('used_at', { withTimezone: true }).defaultNow().notNull(),
})

// Event expenses
export const eventExpenses = pgTable('event_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('USD').notNull(),
  expenseDate: date('expense_date').notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Email deliveries
export const emailDeliveries = pgTable('email_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  emailType: emailTypeEnum('email_type').notNull(),
  recipientEmail: text('recipient_email').notNull(),
  recipientName: text('recipient_name'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  status: emailDeliveryStatusEnum('status').default('pending').notNull(),
  provider: text('provider').notNull(),
  providerMessageId: text('provider_message_id'),
  attemptCount: integer('attempt_count').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(5).notNull(),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  errorCode: text('error_code'),
  metadata: jsonb('metadata').default({}).notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: uuid('resource_id').notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
})

// Audit logs
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: uuid('resource_id').notNull(),
  changes: jsonb('changes'),
  tenantContext: jsonb('tenant_context'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  events: many(events),
  locations: many(eventLocations),
  themes: many(themes),
  payments: many(payments),
  tickets: many(tickets),
  wallets: many(wallets),
  nfcBands: many(nfcBands),
  discounts: many(discounts),
  expenses: many(eventExpenses),
  auditLogs: many(auditLogs),
  emailDeliveries: many(emailDeliveries),
}))

export const emailDeliveriesRelations = relations(emailDeliveries, ({ one }) => ({
  organization: one(organizations, {
    fields: [emailDeliveries.organizationId],
    references: [organizations.id],
  }),
}))

export const eventLocationsRelations = relations(eventLocations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [eventLocations.organizationId],
    references: [organizations.id],
  }),
  events: many(events),
}))

export const ticketUsageRulesRelations = relations(ticketUsageRules, ({ one }) => ({
  ticketType: one(ticketTypes, {
    fields: [ticketUsageRules.ticketTypeId],
    references: [ticketTypes.id],
  }),
}))

export const usersRelations = relations(users, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  roles: many(userRoles),
  wallet: one(wallets),
  tickets: many(tickets),
  payments: many(payments),
  nfcBands: many(nfcBands),
  createdEvents: many(events),
}))

export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
  location: one(eventLocations, {
    fields: [events.locationId],
    references: [eventLocations.id],
  }),
  theme: one(themes),
  createdByUser: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  ticketTypes: many(ticketTypes),
  tickets: many(tickets),
  expenses: many(eventExpenses),
}))

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tickets.organizationId],
    references: [organizations.id],
  }),
  ticketType: one(ticketTypes),
  event: one(events),
  purchaser: one(users, {
    fields: [tickets.purchaserId],
    references: [users.id],
  }),
  payment: one(payments),
  ticketGroup: one(ticketGroups, {
    fields: [tickets.ticketGroupId],
    references: [ticketGroups.id],
  }),
  scans: many(ticketScans),
  nonces: many(ticketNonces),
  assignments: many(ticketAssignments),
}))

export const ticketGroupsRelations = relations(ticketGroups, ({ one, many }) => ({
  event: one(events, {
    fields: [ticketGroups.eventId],
    references: [events.id],
  }),
  ticketType: one(ticketTypes, {
    fields: [ticketGroups.ticketTypeId],
    references: [ticketTypes.id],
  }),
  promoter: one(users, {
    fields: [ticketGroups.promoterId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [ticketGroups.organizationId],
    references: [organizations.id],
  }),
  payment: one(payments, {
    fields: [ticketGroups.paymentId],
    references: [payments.id],
  }),
  cancelledByUser: one(users, {
    fields: [ticketGroups.cancelledBy],
    references: [users.id],
  }),
  tickets: many(tickets),
  assignments: many(ticketAssignments),
}))

export const ticketAssignmentsRelations = relations(ticketAssignments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketAssignments.ticketId],
    references: [tickets.id],
  }),
  ticketGroup: one(ticketGroups, {
    fields: [ticketAssignments.ticketGroupId],
    references: [ticketGroups.id],
  }),
  promoter: one(users, {
    fields: [ticketAssignments.promoterId],
    references: [users.id],
  }),
  assignedByUser: one(users, {
    fields: [ticketAssignments.assignedBy],
    references: [users.id],
  }),
}))

export const ticketNoncesRelations = relations(ticketNonces, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketNonces.ticketId],
    references: [tickets.id],
  }),
  scan: one(ticketScans, {
    fields: [ticketNonces.scanId],
    references: [ticketScans.id],
  }),
}))

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  user: one(users),
  cancelledByUser: one(users, {
    fields: [payments.cancelledBy],
    references: [users.id],
    relationName: 'cancelled_payments',
  }),
  items: many(paymentItems),
  tickets: many(tickets),
  transactions: many(paymentTransactions),
}))

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentTransactions.paymentId],
    references: [payments.id],
  }),
  organization: one(organizations, {
    fields: [paymentTransactions.organizationId],
    references: [organizations.id],
  }),
}))

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [wallets.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [wallets.eventId],
    references: [events.id],
  }),
  transactions: many(walletTransactions),
}))

export const ticketTypesRelations = relations(ticketTypes, ({ one, many }) => ({
  event: one(events, {
    fields: [ticketTypes.eventId],
    references: [events.id],
  }),
  tickets: many(tickets),
  usageRules: many(ticketUsageRules),
}))

export const nfcBandsRelations = relations(nfcBands, ({ one, many }) => ({
  user: one(users, {
    fields: [nfcBands.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [nfcBands.organizationId],
    references: [organizations.id],
  }),
  event: one(events, {
    fields: [nfcBands.eventId],
    references: [events.id],
  }),
  registeredByUser: one(users, {
    fields: [nfcBands.registeredBy],
    references: [users.id],
    relationName: 'registered_nfc_bands',
  }),
  transactions: many(nfcTransactions),
  nonces: many(nfcNonces),
  usageSessions: many(nfcUsageSessions),
  rateLimit: one(nfcRateLimits, {
    fields: [nfcBands.id],
    references: [nfcRateLimits.nfcBandId],
  }),
}))

export const nfcTransactionsRelations = relations(nfcTransactions, ({ one }) => ({
  nfcBand: one(nfcBands, {
    fields: [nfcTransactions.nfcBandId],
    references: [nfcBands.id],
  }),
  user: one(users, {
    fields: [nfcTransactions.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [nfcTransactions.organizationId],
    references: [organizations.id],
  }),
  event: one(events, {
    fields: [nfcTransactions.eventId],
    references: [events.id],
  }),
}))

export const nfcNoncesRelations = relations(nfcNonces, ({ one }) => ({
  nfcBand: one(nfcBands, {
    fields: [nfcNonces.nfcBandId],
    references: [nfcBands.id],
  }),
  transaction: one(nfcTransactions, {
    fields: [nfcNonces.transactionId],
    references: [nfcTransactions.id],
  }),
}))

export const nfcUsageSessionsRelations = relations(nfcUsageSessions, ({ one }) => ({
  nfcBand: one(nfcBands, {
    fields: [nfcUsageSessions.nfcBandId],
    references: [nfcBands.id],
  }),
}))

export const nfcRateLimitsRelations = relations(nfcRateLimits, ({ one }) => ({
  nfcBand: one(nfcBands, {
    fields: [nfcRateLimits.nfcBandId],
    references: [nfcBands.id],
  }),
}))

export const themesRelations = relations(themes, ({ one, many }) => ({
  event: one(events, {
    fields: [themes.eventId],
    references: [events.id],
  }),
  organization: one(organizations, {
    fields: [themes.organizationId],
    references: [organizations.id],
  }),
  parentTheme: one(themes, {
    fields: [themes.parentThemeId],
    references: [themes.id],
    relationName: 'parent_theme',
  }),
  childThemes: many(themes, {
    relationName: 'parent_theme',
  }),
  createdByUser: one(users, {
    fields: [themes.createdBy],
    references: [users.id],
    relationName: 'created_themes',
  }),
  versions: many(themeVersions),
  cacheTags: many(themeCacheTags),
  assets: many(themeAssets),
}))

export const themeVersionsRelations = relations(themeVersions, ({ one }) => ({
  theme: one(themes, {
    fields: [themeVersions.themeId],
    references: [themes.id],
  }),
  createdByUser: one(users, {
    fields: [themeVersions.createdBy],
    references: [users.id],
    relationName: 'created_theme_versions',
  }),
}))

export const themeCacheTagsRelations = relations(themeCacheTags, ({ one }) => ({
  theme: one(themes, {
    fields: [themeCacheTags.themeId],
    references: [themes.id],
  }),
}))

export const themeAssetsRelations = relations(themeAssets, ({ one }) => ({
  theme: one(themes, {
    fields: [themeAssets.themeId],
    references: [themes.id],
  }),
}))

