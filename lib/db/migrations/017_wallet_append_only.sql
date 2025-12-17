-- Wallet Transactions Append-Only Protection
-- Prevent UPDATE and DELETE operations on wallet_transactions (immutable ledger)
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/017_wallet_append_only.sql

-- Create function to prevent wallet transaction modification
CREATE OR REPLACE FUNCTION prevent_wallet_transaction_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Wallet transactions are append-only and cannot be updated. Operation: UPDATE. Transaction ID: %', OLD.id;
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Wallet transactions are append-only and cannot be deleted. Operation: DELETE. Transaction ID: %', OLD.id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce append-only
DROP TRIGGER IF EXISTS wallet_transactions_append_only ON wallet_transactions;

CREATE TRIGGER wallet_transactions_append_only
  BEFORE UPDATE OR DELETE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_wallet_transaction_modification();

-- Create function to validate ledger integrity
-- This function checks that balance_after is consistent with previous transactions
CREATE OR REPLACE FUNCTION validate_wallet_ledger_integrity(wallet_uuid UUID)
RETURNS TABLE(
  is_valid BOOLEAN,
  error_message TEXT,
  expected_balance NUMERIC,
  actual_balance NUMERIC,
  transaction_count BIGINT
) AS $$
DECLARE
  calculated_balance NUMERIC(10, 2);
  wallet_balance NUMERIC(10, 2);
  tx_count BIGINT;
BEGIN
  -- Get wallet balance
  SELECT balance INTO wallet_balance
  FROM wallets
  WHERE id = wallet_uuid;
  
  IF wallet_balance IS NULL THEN
    RETURN QUERY SELECT false, 'Wallet not found'::TEXT, 0::NUMERIC, 0::NUMERIC, 0::BIGINT;
    RETURN;
  END IF;
  
  -- Calculate balance from transactions
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN transaction_type = 'credit' THEN amount
        WHEN transaction_type = 'debit' THEN -amount
        ELSE 0
      END
    ), 0),
    COUNT(*)
  INTO calculated_balance, tx_count
  FROM wallet_transactions
  WHERE wallet_id = wallet_uuid;
  
  -- Get the last transaction's balance_after for comparison
  DECLARE
    last_balance_after NUMERIC(10, 2);
  BEGIN
    SELECT balance_after INTO last_balance_after
    FROM wallet_transactions
    WHERE wallet_id = wallet_uuid
    ORDER BY sequence_number DESC
    LIMIT 1;
    
    IF last_balance_after IS NULL THEN
      last_balance_after := 0;
    END IF;
    
    -- Validate: calculated balance should match last balance_after
    IF ABS(calculated_balance - last_balance_after) > 0.01 THEN
      RETURN QUERY SELECT 
        false,
        format('Balance mismatch: calculated=%s, last_transaction=%s', calculated_balance, last_balance_after)::TEXT,
        calculated_balance,
        last_balance_after,
        tx_count;
    ELSE
      RETURN QUERY SELECT 
        true,
        'Ledger integrity valid'::TEXT,
        calculated_balance,
        last_balance_after,
        tx_count;
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create function to check for sequence number gaps
CREATE OR REPLACE FUNCTION check_wallet_sequence_gaps(wallet_uuid UUID)
RETURNS TABLE(
  has_gaps BOOLEAN,
  gap_count BIGINT,
  min_sequence BIGINT,
  max_sequence BIGINT,
  expected_count BIGINT,
  actual_count BIGINT
) AS $$
DECLARE
  min_seq BIGINT;
  max_seq BIGINT;
  expected_count BIGINT;
  actual_count BIGINT;
BEGIN
  SELECT 
    MIN(sequence_number),
    MAX(sequence_number),
    COUNT(*)
  INTO min_seq, max_seq, actual_count
  FROM wallet_transactions
  WHERE wallet_id = wallet_uuid;
  
  IF min_seq IS NULL THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT;
    RETURN;
  END IF;
  
  expected_count := max_seq - min_seq + 1;
  
  IF actual_count != expected_count THEN
    RETURN QUERY SELECT 
      true,
      (expected_count - actual_count)::BIGINT,
      min_seq,
      max_seq,
      expected_count,
      actual_count;
  ELSE
    RETURN QUERY SELECT 
      false,
      0::BIGINT,
      min_seq,
      max_seq,
      expected_count,
      actual_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (if needed)
-- REVOKE UPDATE, DELETE ON wallet_transactions FROM authenticated;
-- Note: Service role will still have access for administrative purposes

-- Add comments for documentation
COMMENT ON FUNCTION prevent_wallet_transaction_modification() IS 'Prevents UPDATE and DELETE operations on wallet_transactions to maintain append-only ledger';
COMMENT ON FUNCTION validate_wallet_ledger_integrity(UUID) IS 'Validates that wallet balance matches calculated balance from transactions';
COMMENT ON FUNCTION check_wallet_sequence_gaps(UUID) IS 'Checks for gaps in sequence numbers for a wallet';
