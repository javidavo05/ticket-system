-- Email Delivery Tracking Table
-- Tracks all email deliveries with idempotency, retry logic, and status
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/009_email_delivery.sql

CREATE TYPE email_delivery_status AS ENUM ('pending', 'sent', 'failed', 'retrying');
CREATE TYPE email_type AS ENUM ('ticket_delivery', 'payment_confirmation', 'password_reset', 'email_verification', 'other');

CREATE TABLE IF NOT EXISTS email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type email_type NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  status email_delivery_status DEFAULT 'pending' NOT NULL,
  provider TEXT NOT NULL, -- 'brevo', 'resend', etc.
  provider_message_id TEXT,
  attempt_count INTEGER DEFAULT 0 NOT NULL,
  max_attempts INTEGER DEFAULT 5 NOT NULL,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  error_message TEXT,
  error_code TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resource_type TEXT NOT NULL, -- 'ticket', 'payment', etc.
  resource_id UUID NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  sent_at TIMESTAMPTZ
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_deliveries_idempotency_key ON email_deliveries(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_status_next_retry 
  ON email_deliveries(status, next_retry_at) 
  WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_email_deliveries_resource 
  ON email_deliveries(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_organization 
  ON email_deliveries(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_recipient 
  ON email_deliveries(recipient_email, created_at DESC);

-- Enable RLS
ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;

