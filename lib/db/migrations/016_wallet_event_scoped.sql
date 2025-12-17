-- Wallet Event-Scoped Migration
-- Adds support for event-scoped wallets and idempotency
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/016_wallet_event_scoped.sql

-- Step 1: Add event_id to wallets table (nullable for backward compatibility)
ALTER TABLE wallets 
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Step 2: Remove the UNIQUE constraint on user_id (we'll add a composite unique constraint)
-- First, drop the existing unique constraint if it exists
DO $$
BEGIN
  -- Check if unique constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'wallets_user_id_key' 
    AND conrelid = 'wallets'::regclass
  ) THEN
    ALTER TABLE wallets DROP CONSTRAINT wallets_user_id_key;
  END IF;
END $$;

-- Step 3: Create composite unique constraint (user_id, event_id)
-- This allows one wallet per user per event, and one global wallet per user (event_id = NULL)
-- Use a partial unique index to handle NULL values properly
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_user_event_unique 
  ON wallets(user_id, COALESCE(event_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE event_id IS NOT NULL;

-- Also create a unique index for global wallets (event_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_user_global_unique
  ON wallets(user_id)
  WHERE event_id IS NULL;

-- Step 4: Add new columns to wallet_transactions for idempotency and auditability
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS sequence_number BIGSERIAL,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT NOW();

-- Step 5: Create sequence for wallet_transactions if it doesn't exist
-- Note: BIGSERIAL creates a sequence automatically, but we need to ensure existing rows have sequence numbers
DO $$
DECLARE
  max_seq BIGINT;
BEGIN
  -- Get the maximum sequence number from existing transactions, or start at 0
  SELECT COALESCE(MAX(sequence_number), 0) INTO max_seq FROM wallet_transactions;
  
  -- Update existing rows to have sequence numbers starting from max_seq + 1
  -- This is done per wallet_id to maintain proper ordering
  WITH numbered_transactions AS (
    SELECT 
      id,
      wallet_id,
      ROW_NUMBER() OVER (PARTITION BY wallet_id ORDER BY created_at, id) + max_seq as new_seq
    FROM wallet_transactions
    WHERE sequence_number IS NULL OR sequence_number = 0
  )
  UPDATE wallet_transactions wt
  SET sequence_number = nt.new_seq
  FROM numbered_transactions nt
  WHERE wt.id = nt.id;
END $$;

-- Step 6: Make sequence_number NOT NULL after backfilling
ALTER TABLE wallet_transactions
  ALTER COLUMN sequence_number SET NOT NULL;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_event 
  ON wallets(user_id, event_id) 
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallets_user_global 
  ON wallets(user_id) 
  WHERE event_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_idempotency_key 
  ON wallet_transactions(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_sequence 
  ON wallet_transactions(wallet_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_event_created 
  ON wallet_transactions(event_id, created_at) 
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_processed_at 
  ON wallet_transactions(processed_at);

-- Step 8: Add comment for documentation
COMMENT ON COLUMN wallets.event_id IS 'Event ID for event-scoped wallets. NULL for global user wallets.';
COMMENT ON COLUMN wallet_transactions.idempotency_key IS 'Unique key for idempotent transaction processing';
COMMENT ON COLUMN wallet_transactions.sequence_number IS 'Sequential number per wallet for transaction ordering';
COMMENT ON COLUMN wallet_transactions.metadata IS 'Additional metadata for audit and reconciliation';
COMMENT ON COLUMN wallet_transactions.processed_at IS 'Timestamp when transaction was processed';
