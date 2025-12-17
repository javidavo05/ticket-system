-- Analytics Indexes Migration
-- Strategic indexes optimized for analytics and reporting queries
-- Run this migration using: npm run run:migrations

-- Events indexes for analytics
-- Composite index for queries filtering by status and date range
CREATE INDEX IF NOT EXISTS idx_events_status_created_analytics 
  ON events(status, created_at) 
  WHERE deleted_at IS NULL;

-- Index for date range queries on events
CREATE INDEX IF NOT EXISTS idx_events_date_range_analytics 
  ON events(start_date, end_date) 
  WHERE deleted_at IS NULL;

-- Index for active events queries
CREATE INDEX IF NOT EXISTS idx_events_active_analytics 
  ON events(status, start_date, end_date) 
  WHERE deleted_at IS NULL AND status IN ('published', 'live');

-- Tickets indexes for analytics
-- Composite index for event analytics queries
CREATE INDEX IF NOT EXISTS idx_tickets_event_status_created_analytics 
  ON tickets(event_id, status, created_at);

-- Index for queries filtering paid/used tickets
CREATE INDEX IF NOT EXISTS idx_tickets_status_paid_analytics 
  ON tickets(status, created_at) 
  WHERE status IN ('paid', 'used');

-- Index for scan count queries
CREATE INDEX IF NOT EXISTS idx_tickets_scan_count_analytics 
  ON tickets(event_id, scan_count) 
  WHERE scan_count > 0;

-- Index for ticket type analytics
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type_status_analytics 
  ON tickets(ticket_type_id, status, created_at);

-- Payments indexes for analytics
-- Note: payments don't have event_id directly, they relate through tickets.payment_id
-- Index for revenue calculations (completed payments)
CREATE INDEX IF NOT EXISTS idx_payments_status_amount_analytics 
  ON payments(status, amount, created_at) 
  WHERE status = 'completed';

-- Index for provider analytics
CREATE INDEX IF NOT EXISTS idx_payments_provider_status_analytics 
  ON payments(provider, status, created_at);

-- Index for payment method analytics
CREATE INDEX IF NOT EXISTS idx_payments_method_status_analytics 
  ON payments(payment_method, status, created_at);

-- Ticket scans indexes for attendance analytics
-- Index for attendance queries
CREATE INDEX IF NOT EXISTS idx_ticket_scans_created_analytics 
  ON ticket_scans(created_at) 
  WHERE is_valid = true;

-- Composite index for event attendance (through ticket)
CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket_created_analytics 
  ON ticket_scans(ticket_id, created_at) 
  WHERE is_valid = true;

-- Index for hourly attendance analysis
CREATE INDEX IF NOT EXISTS idx_ticket_scans_hourly_analytics 
  ON ticket_scans(created_at) 
  WHERE is_valid = true;

-- Payment transactions indexes for analytics
-- Index for transaction history queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_status_analytics 
  ON payment_transactions(payment_id, status, created_at);

-- Index for completed transactions analytics
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status_created_analytics 
  ON payment_transactions(status, created_at) 
  WHERE status = 'completed';

-- Ticket types indexes for analytics
-- Index for ticket type performance
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_sold_analytics 
  ON ticket_types(event_id, quantity_sold, created_at);

-- Users indexes for analytics
-- Index for user activity queries
CREATE INDEX IF NOT EXISTS idx_users_created_analytics 
  ON users(created_at) 
  WHERE deleted_at IS NULL;

-- Index for active users queries
CREATE INDEX IF NOT EXISTS idx_users_active_analytics 
  ON users(created_at, updated_at) 
  WHERE deleted_at IS NULL;

-- Event expenses indexes for analytics
-- Index for expense queries by event
CREATE INDEX IF NOT EXISTS idx_event_expenses_event_date_analytics 
  ON event_expenses(event_id, expense_date);

-- Index for expense category analytics
CREATE INDEX IF NOT EXISTS idx_event_expenses_category_analytics 
  ON event_expenses(event_id, category, amount);

-- Composite indexes for common analytics queries
-- Index for event performance (tickets + payments)
CREATE INDEX IF NOT EXISTS idx_tickets_payment_event_analytics 
  ON tickets(event_id, payment_id, status, created_at) 
  WHERE payment_id IS NOT NULL;

-- Index for revenue by ticket type
CREATE INDEX IF NOT EXISTS idx_tickets_type_payment_analytics 
  ON tickets(ticket_type_id, payment_id, status) 
  WHERE payment_id IS NOT NULL AND status IN ('paid', 'used');

-- Note: Partial indexes with NOW() are not supported (NOW() is not immutable)
-- For recent activity queries, use the existing indexes and filter in the query
-- The existing indexes on created_at will be sufficient for time-based queries

