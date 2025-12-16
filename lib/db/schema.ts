import { pgTable, uuid, text, timestamp, numeric, integer, boolean, jsonb, pgEnum, point, inet, date } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'event_admin', 'accounting', 'scanner', 'promoter'])
export const eventTypeEnum = pgEnum('event_type', ['concert', 'festival', 'conference', 'sports', 'theater', 'other'])
export const eventStatusEnum = pgEnum('event_status', ['draft', 'published', 'live', 'ended', 'archived'])
export const ticketStatusEnum = pgEnum('ticket_status', ['pending_payment', 'paid', 'used', 'revoked', 'refunded'])
export const scanMethodEnum = pgEnum('scan_method', ['qr', 'nfc', 'manual'])
export const paymentProviderEnum = pgEnum('payment_provider', ['yappy', 'paguelofacil', 'bank_transfer', 'wallet'])
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'refunded'])
export const paymentMethodEnum = pgEnum('payment_method', ['card', 'transfer', 'qr', 'wallet'])
export const itemTypeEnum = pgEnum('item_type', ['ticket', 'wallet_reload', 'refund'])
export const transactionTypeEnum = pgEnum('transaction_type', ['credit', 'debit'])
export const referenceTypeEnum = pgEnum('reference_type', ['payment', 'reload', 'refund', 'purchase', 'transfer'])
export const nfcBandStatusEnum = pgEnum('nfc_band_status', ['active', 'lost', 'deactivated'])
export const nfcTransactionTypeEnum = pgEnum('nfc_transaction_type', ['payment', 'access_control'])
export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed_amount'])

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  phone: text('phone'),
  nationalId: text('national_id'), // Encrypted at application level
  profilePhotoUrl: text('profile_photo_url'),
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Events
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  eventType: eventTypeEnum('event_type'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  isMultiDay: boolean('is_multi_day').default(false).notNull(),
  locationName: text('location_name'),
  locationAddress: text('location_address'),
  locationCoordinates: point('location_coordinates'),
  themeId: uuid('theme_id').references(() => themes.id),
  status: eventStatusEnum('status').default('draft').notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// Themes
export const themes = pgTable('themes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  config: jsonb('config').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

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

// Tickets
export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketNumber: text('ticket_number').notNull().unique(),
  ticketTypeId: uuid('ticket_type_id').references(() => ticketTypes.id).notNull(),
  eventId: uuid('event_id').references(() => events.id).notNull(),
  purchaserId: uuid('purchaser_id').references(() => users.id),
  purchaserEmail: text('purchaser_email').notNull(),
  purchaserName: text('purchaser_name').notNull(),
  qrSignature: text('qr_signature').notNull(),
  qrPayload: jsonb('qr_payload').notNull(),
  status: ticketStatusEnum('status').default('pending_payment').notNull(),
  paymentId: uuid('payment_id').references(() => payments.id),
  promoterId: uuid('promoter_id').references(() => users.id),
  assignedToEmail: text('assigned_to_email'),
  assignedToName: text('assigned_to_name'),
  scanCount: integer('scan_count').default(0).notNull(),
  firstScanAt: timestamp('first_scan_at', { withTimezone: true }),
  lastScanAt: timestamp('last_scan_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Ticket scans
export const ticketScans = pgTable('ticket_scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
  scannedBy: uuid('scanned_by').references(() => users.id).notNull(),
  scanLocation: point('scan_location'),
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
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('USD').notNull(),
  provider: paymentProviderEnum('provider').notNull(),
  providerPaymentId: text('provider_payment_id'),
  status: paymentStatusEnum('status').default('pending').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
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
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  balance: numeric('balance', { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Wallet transactions
export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').references(() => wallets.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  transactionType: transactionTypeEnum('transaction_type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  balanceAfter: numeric('balance_after', { precision: 10, scale: 2 }).notNull(),
  referenceType: referenceTypeEnum('reference_type').notNull(),
  referenceId: uuid('reference_id'),
  description: text('description').notNull(),
  eventId: uuid('event_id').references(() => events.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// NFC bands
export const nfcBands = pgTable('nfc_bands', {
  id: uuid('id').primaryKey().defaultRandom(),
  bandUid: text('band_uid').notNull().unique(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  eventId: uuid('event_id').references(() => events.id),
  registeredBy: uuid('registered_by').references(() => users.id).notNull(),
  registeredAt: timestamp('registered_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  status: nfcBandStatusEnum('status').default('active').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// NFC transactions
export const nfcTransactions = pgTable('nfc_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  nfcBandId: uuid('nfc_band_id').references(() => nfcBands.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  eventId: uuid('event_id').references(() => events.id).notNull(),
  transactionType: nfcTransactionTypeEnum('transaction_type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }),
  zoneId: text('zone_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Discounts
export const discounts = pgTable('discounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
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
  category: text('category').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('USD').notNull(),
  expenseDate: date('expense_date').notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Audit logs
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: uuid('resource_id').notNull(),
  changes: jsonb('changes'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  roles: many(userRoles),
  wallet: one(wallets),
  tickets: many(tickets),
  payments: many(payments),
  nfcBands: many(nfcBands),
  createdEvents: many(events),
}))

export const eventsRelations = relations(events, ({ one, many }) => ({
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
  ticketType: one(ticketTypes),
  event: one(events),
  purchaser: one(users, {
    fields: [tickets.purchaserId],
    references: [users.id],
  }),
  payment: one(payments),
  scans: many(ticketScans),
}))

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  user: one(users),
  items: many(paymentItems),
  tickets: many(tickets),
}))

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(walletTransactions),
}))

