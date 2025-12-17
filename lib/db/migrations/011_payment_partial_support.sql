-- Payment Partial Support and Transactions
-- Adds support for partial payments and payment transaction history
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/011_payment_partial_support.sql

-- Add CANCELLED to payment_status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status' AND 
                 EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status'))) THEN
    ALTER TYPE payment_status ADD VALUE 'cancelled';
  END IF;
END $$;

-- Add columns to payments table for partial payment support
ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS allows_partial BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS min_partial_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add constraint to ensure amount_paid <= amount
ALTER TABLE payments 
  ADD CONSTRAINT check_amount_paid_not_exceeds_amount 
  CHECK (amount_paid <= amount);

-- Add constraint to ensure amount_paid >= 0
ALTER TABLE payments 
  ADD CONSTRAINT check_amount_paid_non_negative 
  CHECK (amount_paid >= 0);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'adjustment')),
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id 
  ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_transaction_id 
  ON payment_transactions(provider_transaction_id) 
  WHERE provider_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
  ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at 
  ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_organization 
  ON payment_transactions(organization_id, created_at DESC);

-- Index for payment expiration
CREATE INDEX IF NOT EXISTS idx_payments_expires_at 
  ON payments(expires_at) 
  WHERE expires_at IS NOT NULL AND status = 'pending'::payment_status;

-- Index for payment status and amount_paid (for partial payment queries)
CREATE INDEX IF NOT EXISTS idx_payments_status_amount_paid 
  ON payments(status, amount_paid) 
  WHERE allows_partial = true;

-- Enable RLS on payment_transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

