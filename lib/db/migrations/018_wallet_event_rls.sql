-- Wallet Event-Scoped RLS Policies
-- Update RLS policies to support event-scoped wallets
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/018_wallet_event_rls.sql

-- Helper function to check if user can access event wallet
CREATE OR REPLACE FUNCTION can_access_event_wallet(user_id UUID, wallet_event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admins can access all
  IF is_super_admin(user_id) THEN
    RETURN true;
  END IF;
  
  -- If wallet is global (event_id IS NULL), user must own it
  IF wallet_event_id IS NULL THEN
    RETURN false; -- Global wallets are handled by user_id check
  END IF;
  
  -- Event admins can access wallets for their events
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = can_access_event_wallet.user_id
      AND user_roles.event_id = wallet_event_id
      AND user_roles.role = 'event_admin'::user_role
  ) THEN
    RETURN true;
  END IF;
  
  -- Accounting can access wallets in their organization
  IF EXISTS (
    SELECT 1 FROM users
    JOIN wallets ON wallets.user_id = users.id
    WHERE users.id = can_access_event_wallet.user_id
      AND user_has_role(users.id, 'accounting')
      AND wallets.event_id = wallet_event_id
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing wallet policies
DROP POLICY IF EXISTS "Users can view their own wallet in their organization" ON wallets;
DROP POLICY IF EXISTS "Users can view their own wallet transactions in their organization" ON wallet_transactions;

-- Wallets policies - Updated for event-scoped wallets
CREATE POLICY "Users can view their own wallets"
  ON wallets FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      -- Users can view their own wallets (global and event-scoped)
      user_id = auth.uid()
      -- Event admins can view wallets for their events
      OR can_access_event_wallet(auth.uid(), event_id)
      -- Super admins can view all
      OR is_super_admin(auth.uid())
    )
  );

-- Event admins can view wallets for their events
CREATE POLICY "Event admins can view wallets for their events"
  ON wallets FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
          AND user_roles.event_id = wallets.event_id
          AND user_roles.role = 'event_admin'::user_role
      )
      OR is_super_admin(auth.uid())
    )
  );

-- Accounting can view all wallets in their organization
CREATE POLICY "Accounting can view all wallets in their organization"
  ON wallets FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      user_has_role(auth.uid(), 'accounting')
      OR is_super_admin(auth.uid())
    )
  );

-- Wallet transactions policies - Updated for event-scoped wallets
CREATE POLICY "Users can view their own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      -- Users can view their own transactions
      user_id = auth.uid()
      -- Event admins can view transactions for wallets in their events
      OR EXISTS (
        SELECT 1 FROM wallets
        JOIN user_roles ON user_roles.event_id = wallets.event_id
        WHERE wallets.id = wallet_transactions.wallet_id
          AND user_roles.user_id = auth.uid()
          AND user_roles.role = 'event_admin'::user_role
      )
      -- Super admins can view all
      OR is_super_admin(auth.uid())
    )
  );

-- Event admins can view transactions for wallets in their events
CREATE POLICY "Event admins can view wallet transactions for their events"
  ON wallet_transactions FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM wallets
        JOIN user_roles ON user_roles.event_id = wallets.event_id
        WHERE wallets.id = wallet_transactions.wallet_id
          AND user_roles.user_id = auth.uid()
          AND user_roles.role = 'event_admin'::user_role
      )
      OR is_super_admin(auth.uid())
    )
  );

-- Accounting can view all wallet transactions in their organization
CREATE POLICY "Accounting can view all wallet transactions in their organization"
  ON wallet_transactions FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      user_has_role(auth.uid(), 'accounting')
      OR is_super_admin(auth.uid())
    )
  );

-- Service role can manage all wallets (for backend operations)
-- Note: Service role bypasses RLS, so no explicit policy needed
-- But we document it here for clarity

-- Add comments for documentation
COMMENT ON FUNCTION can_access_event_wallet(UUID, UUID) IS 'Checks if a user can access a wallet for a specific event';
COMMENT ON POLICY "Users can view their own wallets" ON wallets IS 'Users can view their own wallets (global and event-scoped)';
COMMENT ON POLICY "Event admins can view wallets for their events" ON wallets IS 'Event admins can view wallets for events they manage';
COMMENT ON POLICY "Accounting can view all wallets in their organization" ON wallets IS 'Accounting role can view all wallets in their organization';
