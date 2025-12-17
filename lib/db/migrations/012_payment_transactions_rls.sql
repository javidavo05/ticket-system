-- Payment Transactions RLS Policies
-- Row Level Security for payment_transactions table
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/012_payment_transactions_rls.sql

-- Ensure payment_transactions table exists (should be created in 011_payment_partial_support.sql)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
    RAISE EXCEPTION 'Table payment_transactions does not exist. Please run migration 011_payment_partial_support.sql first.';
  END IF;
END $$;

-- Helper function to check if user can view payment transaction
CREATE OR REPLACE FUNCTION can_view_payment_transaction(user_id UUID, transaction_payment_id UUID, transaction_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admins can view all
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = can_view_payment_transaction.user_id
      AND user_roles.role = 'super_admin'::user_role
  ) THEN
    RETURN true;
  END IF;

  -- Users can view transactions for their own payments
  RETURN EXISTS (
    SELECT 1 FROM payments
    WHERE payments.id = transaction_payment_id
      AND payments.user_id = can_view_payment_transaction.user_id
  )
  OR EXISTS (
    -- Event admins can view transactions for payments in their events
    SELECT 1 FROM payments
    JOIN payment_items ON payment_items.payment_id = payments.id
    JOIN tickets ON payment_items.ticket_id = tickets.id
    JOIN user_roles ON user_roles.event_id = tickets.event_id
    WHERE payments.id = transaction_payment_id
      AND user_roles.user_id = can_view_payment_transaction.user_id
      AND user_roles.role = 'event_admin'::user_role
  )
  OR EXISTS (
    -- Accounting can view all transactions in their organization
    SELECT 1 FROM users
    JOIN user_roles ON user_roles.user_id = users.id
    WHERE users.id = can_view_payment_transaction.user_id
      AND users.organization_id = transaction_org_id
      AND user_roles.role = 'accounting'::user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view transactions for their own payments" ON payment_transactions;
DROP POLICY IF EXISTS "Service role can manage all payment transactions" ON payment_transactions;

-- RLS Policies
CREATE POLICY "Users can view transactions for their own payments"
  ON payment_transactions FOR SELECT
  USING (
    can_view_payment_transaction(auth.uid(), payment_id, organization_id)
  );

CREATE POLICY "Service role can manage all payment transactions"
  ON payment_transactions FOR ALL
  USING (true) -- RLS is bypassed for service role client
  WITH CHECK (true);

