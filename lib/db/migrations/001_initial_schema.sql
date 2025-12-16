-- Initial Schema Migration
-- This file contains the SQL for creating all tables and enums
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/001_initial_schema.sql

-- Create enums
CREATE TYPE user_role AS ENUM ('super_admin', 'event_admin', 'accounting', 'scanner', 'promoter');
CREATE TYPE event_type AS ENUM ('concert', 'festival', 'conference', 'sports', 'theater', 'other');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'live', 'ended', 'archived');
CREATE TYPE ticket_status AS ENUM ('pending_payment', 'paid', 'used', 'revoked', 'refunded');
CREATE TYPE scan_method AS ENUM ('qr', 'nfc', 'manual');
CREATE TYPE payment_provider AS ENUM ('yappy', 'paguelofacil', 'bank_transfer', 'wallet');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('card', 'transfer', 'qr', 'wallet');
CREATE TYPE item_type AS ENUM ('ticket', 'wallet_reload', 'refund');
CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
CREATE TYPE reference_type AS ENUM ('payment', 'reload', 'refund', 'purchase', 'transfer');
CREATE TYPE nfc_band_status AS ENUM ('active', 'lost', 'deactivated');
CREATE TYPE nfc_transaction_type AS ENUM ('payment', 'access_control');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');

-- Create tables (users table should extend auth.users, so we'll create a profile table)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  national_id TEXT, -- Encrypted at application level
  profile_photo_url TEXT,
  wallet_balance NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  event_type event_type,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_multi_day BOOLEAN DEFAULT false NOT NULL,
  location_name TEXT,
  location_address TEXT,
  location_coordinates POINT,
  theme_id UUID REFERENCES themes(id),
  status event_status DEFAULT 'draft' NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Add foreign key constraint for user_roles.event_id after events table is created
ALTER TABLE user_roles ADD CONSTRAINT user_roles_event_id_fkey 
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  quantity_available INTEGER NOT NULL,
  quantity_sold INTEGER DEFAULT 0 NOT NULL,
  max_per_purchase INTEGER,
  is_multi_scan BOOLEAN DEFAULT false NOT NULL,
  max_scans INTEGER,
  sale_start TIMESTAMPTZ,
  sale_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id),
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  provider payment_provider NOT NULL,
  provider_payment_id TEXT,
  status payment_status DEFAULT 'pending' NOT NULL,
  payment_method payment_method NOT NULL,
  metadata JSONB,
  webhook_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  ticket_type_id UUID REFERENCES ticket_types(id) NOT NULL,
  event_id UUID REFERENCES events(id) NOT NULL,
  purchaser_id UUID REFERENCES users(id),
  purchaser_email TEXT NOT NULL,
  purchaser_name TEXT NOT NULL,
  qr_signature TEXT NOT NULL,
  qr_payload JSONB NOT NULL,
  status ticket_status DEFAULT 'pending_payment' NOT NULL,
  payment_id UUID REFERENCES payments(id),
  promoter_id UUID REFERENCES users(id),
  assigned_to_email TEXT,
  assigned_to_name TEXT,
  scan_count INTEGER DEFAULT 0 NOT NULL,
  first_scan_at TIMESTAMPTZ,
  last_scan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  scanned_by UUID REFERENCES users(id) NOT NULL,
  scan_location POINT,
  scan_method scan_method NOT NULL,
  is_valid BOOLEAN NOT NULL,
  rejection_reason TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  ticket_id UUID REFERENCES tickets(id),
  item_type item_type NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  transaction_type transaction_type NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  balance_after NUMERIC(10, 2) NOT NULL,
  reference_type reference_type NOT NULL,
  reference_id UUID,
  description TEXT NOT NULL,
  event_id UUID REFERENCES events(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS nfc_bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_uid TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) NOT NULL,
  event_id UUID REFERENCES events(id),
  registered_by UUID REFERENCES users(id) NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ,
  status nfc_band_status DEFAULT 'active' NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS nfc_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfc_band_id UUID REFERENCES nfc_bands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  event_id UUID REFERENCES events(id) NOT NULL,
  transaction_type nfc_transaction_type NOT NULL,
  amount NUMERIC(10, 2),
  zone_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  discount_type discount_type NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0 NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  min_purchase_amount NUMERIC(10, 2),
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS discount_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id UUID REFERENCES discounts(id) NOT NULL,
  payment_id UUID REFERENCES payments(id) NOT NULL,
  user_id UUID REFERENCES users(id),
  used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS event_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  expense_date DATE NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_event_id ON user_roles(event_id);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_purchaser_id ON tickets(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket_id ON ticket_scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_by ON ticket_scans(scanned_by);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_nfc_bands_user_id ON nfc_bands(user_id);
CREATE INDEX IF NOT EXISTS idx_nfc_bands_band_uid ON nfc_bands(band_uid);
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

