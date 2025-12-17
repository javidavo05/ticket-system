-- Multi-Tenant Indexes Migration
-- Strategic indexes for high-scale multi-tenant queries
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/004_multi_tenant_indexes.sql

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_domain_unique 
  ON organizations(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at 
  ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Event locations indexes
CREATE INDEX IF NOT EXISTS idx_event_locations_org_id 
  ON event_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_locations_coordinates 
  ON event_locations USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_event_locations_deleted_at 
  ON event_locations(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_locations_org_active 
  ON event_locations(organization_id, is_active) WHERE deleted_at IS NULL;

-- Ticket usage rules indexes
CREATE INDEX IF NOT EXISTS idx_ticket_usage_rules_ticket_type_id 
  ON ticket_usage_rules(ticket_type_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ticket_usage_rules_priority 
  ON ticket_usage_rules(priority DESC);

-- Users indexes (with organization)
CREATE INDEX IF NOT EXISTS idx_users_org_id 
  ON users(organization_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_org_email 
  ON users(organization_id, email) WHERE deleted_at IS NULL;

-- Events indexes (composite for tenant + status)
CREATE INDEX IF NOT EXISTS idx_events_org_status 
  ON events(organization_id, status, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_org_start_date 
  ON events(organization_id, start_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_org_location 
  ON events(organization_id, location_id) WHERE deleted_at IS NULL;

-- Tickets indexes (composite for tenant + event + status)
CREATE INDEX IF NOT EXISTS idx_tickets_org_event_status 
  ON tickets(organization_id, event_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_org_purchaser 
  ON tickets(organization_id, purchaser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_org_created 
  ON tickets(organization_id, created_at DESC);

-- Ticket scans indexes
CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket_created 
  ON ticket_scans(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_by_created 
  ON ticket_scans(scanned_by, created_at DESC);

-- Payments indexes (composite for tenant + status + time)
CREATE INDEX IF NOT EXISTS idx_payments_org_status_created 
  ON payments(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_org_user_created 
  ON payments(organization_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_org_provider 
  ON payments(organization_id, provider, status);

-- Payment items indexes
CREATE INDEX IF NOT EXISTS idx_payment_items_payment_id 
  ON payment_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_ticket_id 
  ON payment_items(ticket_id) WHERE ticket_id IS NOT NULL;

-- Wallets indexes
CREATE INDEX IF NOT EXISTS idx_wallets_org_user 
  ON wallets(organization_id, user_id);

-- Wallet transactions indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_org_user 
  ON wallet_transactions(organization_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_org_wallet 
  ON wallet_transactions(organization_id, wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_org_event 
  ON wallet_transactions(organization_id, event_id, created_at DESC) WHERE event_id IS NOT NULL;

-- NFC bands indexes
CREATE INDEX IF NOT EXISTS idx_nfc_bands_org_user 
  ON nfc_bands(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_nfc_bands_org_event 
  ON nfc_bands(organization_id, event_id) WHERE event_id IS NOT NULL;

-- NFC transactions indexes
CREATE INDEX IF NOT EXISTS idx_nfc_transactions_org_event 
  ON nfc_transactions(organization_id, event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nfc_transactions_org_user 
  ON nfc_transactions(organization_id, user_id, created_at DESC);

-- Discounts indexes
CREATE INDEX IF NOT EXISTS idx_discounts_org_code 
  ON discounts(organization_id, code);
CREATE INDEX IF NOT EXISTS idx_discounts_org_event 
  ON discounts(organization_id, event_id) WHERE event_id IS NOT NULL;

-- Event expenses indexes
CREATE INDEX IF NOT EXISTS idx_event_expenses_org_event 
  ON event_expenses(organization_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_expenses_org_date 
  ON event_expenses(organization_id, expense_date DESC);

-- Themes indexes
CREATE INDEX IF NOT EXISTS idx_themes_org_event 
  ON themes(organization_id, event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_themes_org_active 
  ON themes(organization_id, is_active) WHERE is_active = true;

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_org_user 
  ON user_roles(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org_event 
  ON user_roles(organization_id, event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_org_role 
  ON user_roles(organization_id, role);

-- Audit logs indexes (with organization)
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created 
  ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_resource 
  ON audit_logs(organization_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_user 
  ON audit_logs(organization_id, user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_organizations_settings_gin 
  ON organizations USING GIN(settings);
CREATE INDEX IF NOT EXISTS idx_event_locations_facilities_gin 
  ON event_locations USING GIN(facilities);
CREATE INDEX IF NOT EXISTS idx_ticket_usage_rules_config_gin 
  ON ticket_usage_rules USING GIN(rule_config);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changes_gin 
  ON audit_logs USING GIN(changes);
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin 
  ON audit_logs USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_context_gin 
  ON audit_logs USING GIN(tenant_context);

