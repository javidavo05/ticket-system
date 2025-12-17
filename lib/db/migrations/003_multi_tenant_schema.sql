-- Multi-Tenant Schema Migration
-- This migration adds organizations, event_locations, and ticket_usage_rules
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/003_multi_tenant_schema.sql

-- Create organizations table (tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  domain TEXT, -- For subdomain routing
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  subscription_tier TEXT DEFAULT 'free',
  max_events INTEGER,
  max_users INTEGER,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Create event_locations table
CREATE TABLE IF NOT EXISTS event_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT NOT NULL,
  postal_code TEXT,
  coordinates POINT,
  capacity INTEGER,
  facilities JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Create ticket_usage_rules table
CREATE TABLE IF NOT EXISTS ticket_usage_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE NOT NULL,
  rule_type TEXT NOT NULL, -- 'scan_limit', 'time_window', 'zone_restriction', etc.
  rule_config JSONB NOT NULL, -- Flexible configuration per rule type
  priority INTEGER DEFAULT 0, -- For ordering rules
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add organization_id to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add organization_id to events table
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add location_id to events (replacing location_name, location_address, location_coordinates)
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES event_locations(id);

-- Add organization_id to tickets table
ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to payments table
ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to payment_items (via payment -> organization)
-- This is derived, but we can add for performance if needed

-- Add organization_id to wallets table
ALTER TABLE wallets 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to wallet_transactions
ALTER TABLE wallet_transactions 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to nfc_bands
ALTER TABLE nfc_bands 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to nfc_transactions
ALTER TABLE nfc_transactions 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to discounts
ALTER TABLE discounts 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to discount_usage (via discount -> organization)
-- This is derived, but we can add for performance if needed

-- Add organization_id to event_expenses
ALTER TABLE event_expenses 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to themes
ALTER TABLE themes 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to user_roles
ALTER TABLE user_roles 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id and tenant_context to audit_logs
ALTER TABLE audit_logs 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tenant_context JSONB;

-- Make organization_id NOT NULL for events (after data migration)
-- This will be done in a separate step after creating default organization

-- Create default organization for existing data (if any)
-- This should be run after the migration if there's existing data
-- INSERT INTO organizations (id, slug, name, subscription_tier) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'Default Organization', 'free')
-- ON CONFLICT DO NOTHING;

