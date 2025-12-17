-- Multi-Tenant RLS Policies
-- Row Level Security with tenant isolation
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/005_multi_tenant_rls.sql

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_usage_rules ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM users 
    WHERE id = user_id AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user belongs to organization
CREATE OR REPLACE FUNCTION user_belongs_to_org(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT organization_id = org_id
    FROM users
    WHERE id = user_id AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Organizations RLS policies
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id = get_user_organization_id(auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can manage all organizations"
  ON organizations FOR ALL
  USING (is_super_admin(auth.uid()));

-- Event locations RLS policies
CREATE POLICY "Users can view locations in their organization"
  ON event_locations FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Event admins can manage locations in their organization"
  ON event_locations FOR ALL
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      user_has_role(auth.uid(), 'event_admin')
      OR is_super_admin(auth.uid())
    )
  );

-- Ticket usage rules RLS policies
CREATE POLICY "Users can view rules for tickets in their organization"
  ON ticket_usage_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ticket_types
      JOIN events ON ticket_types.event_id = events.id
      WHERE ticket_types.id = ticket_usage_rules.ticket_type_id
        AND events.organization_id = get_user_organization_id(auth.uid())
    )
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Event admins can manage rules for tickets in their organization"
  ON ticket_usage_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ticket_types
      JOIN events ON ticket_types.event_id = events.id
      WHERE ticket_types.id = ticket_usage_rules.ticket_type_id
        AND events.organization_id = get_user_organization_id(auth.uid())
    )
    AND (
      user_has_role(auth.uid(), 'event_admin')
      OR is_super_admin(auth.uid())
    )
  );

-- Update existing RLS policies to include tenant isolation

-- Drop existing policies that need tenant isolation
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Event admins can view users who purchased tickets for their events" ON users;
DROP POLICY IF EXISTS "Super admins can view all users" ON users;

-- Users policies with tenant isolation
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (
    id = auth.uid()
    AND organization_id = get_user_organization_id(auth.uid())
  );

CREATE POLICY "Event admins can view users in their organization"
  ON users FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM tickets
        JOIN events ON tickets.event_id = events.id
        WHERE tickets.purchaser_id = users.id
          AND events.organization_id = get_user_organization_id(auth.uid())
          AND user_has_role(auth.uid(), 'event_admin', events.id)
      )
      OR is_super_admin(auth.uid())
    )
  );

CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Drop and recreate events policies with tenant isolation
DROP POLICY IF EXISTS "Public can view published events" ON events;
DROP POLICY IF EXISTS "Event admins can manage their events" ON events;

CREATE POLICY "Public can view published events in organization"
  ON events FOR SELECT
  USING (
    status IN ('published', 'live') 
    AND deleted_at IS NULL
    AND (
      organization_id = get_user_organization_id(auth.uid())
      OR organization_id IS NULL -- For backward compatibility
    )
  );

CREATE POLICY "Event admins can manage events in their organization"
  ON events FOR ALL
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.event_id = events.id
          AND user_roles.user_id = auth.uid()
          AND user_roles.role = 'event_admin'::user_role
      )
      OR is_super_admin(auth.uid())
    )
  );

-- Update tickets policies with tenant isolation
DROP POLICY IF EXISTS "Users can view their own tickets" ON tickets;
DROP POLICY IF EXISTS "Event admins can view tickets for their events" ON tickets;
DROP POLICY IF EXISTS "Scanners can view tickets for their assigned events" ON tickets;
DROP POLICY IF EXISTS "Promoters can view tickets for their events" ON tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON tickets;

CREATE POLICY "Users can view their own tickets in their organization"
  ON tickets FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      purchaser_id = auth.uid() 
      OR purchaser_email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Event admins can view tickets for their events"
  ON tickets FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.event_id = tickets.event_id
          AND user_roles.user_id = auth.uid()
          AND user_roles.role = 'event_admin'::user_role
      )
      OR is_super_admin(auth.uid())
    )
  );

CREATE POLICY "Scanners can view tickets for their assigned events"
  ON tickets FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.event_id = tickets.event_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'scanner'::user_role
    )
  );

CREATE POLICY "Promoters can view tickets for their events"
  ON tickets FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.event_id = tickets.event_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'promoter'::user_role
    )
  );

CREATE POLICY "Authenticated users can create tickets in their organization"
  ON tickets FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND organization_id = get_user_organization_id(auth.uid())
  );

-- Update payments policies with tenant isolation
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Event admins can view payments for their events" ON payments;
DROP POLICY IF EXISTS "Accounting can view all payments" ON payments;
DROP POLICY IF EXISTS "Promoters can view payments for their events" ON payments;

CREATE POLICY "Users can view their own payments in their organization"
  ON payments FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Event admins can view payments for their events"
  ON payments FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM payment_items
        JOIN tickets ON payment_items.ticket_id = tickets.id
        JOIN user_roles ON user_roles.event_id = tickets.event_id
        WHERE payment_items.payment_id = payments.id
          AND user_roles.user_id = auth.uid()
          AND user_roles.role = 'event_admin'::user_role
      )
      OR is_super_admin(auth.uid())
    )
  );

CREATE POLICY "Accounting can view all payments in their organization"
  ON payments FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      user_has_role(auth.uid(), 'accounting')
      OR is_super_admin(auth.uid())
    )
  );

CREATE POLICY "Promoters can view payments for their events"
  ON payments FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM payment_items
      JOIN tickets ON payment_items.ticket_id = tickets.id
      JOIN user_roles ON user_roles.event_id = tickets.event_id
      WHERE payment_items.payment_id = payments.id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'promoter'::user_role
    )
  );

-- Update wallets policies with tenant isolation
DROP POLICY IF EXISTS "Users can view their own wallet" ON wallets;

CREATE POLICY "Users can view their own wallet in their organization"
  ON wallets FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND user_id = auth.uid()
  );

-- Update wallet transactions policies
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON wallet_transactions;

CREATE POLICY "Users can view their own wallet transactions in their organization"
  ON wallet_transactions FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND user_id = auth.uid()
  );

-- Update NFC bands policies
DROP POLICY IF EXISTS "Users can view their own NFC bands" ON nfc_bands;
DROP POLICY IF EXISTS "Event admins can view NFC bands for their events" ON nfc_bands;

CREATE POLICY "Users can view their own NFC bands in their organization"
  ON nfc_bands FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Event admins can view NFC bands for their events"
  ON nfc_bands FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      event_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.event_id = nfc_bands.event_id
          AND user_roles.user_id = auth.uid()
          AND user_roles.role = 'event_admin'::user_role
      )
      OR is_super_admin(auth.uid())
    )
  );

-- Update NFC transactions policies
DROP POLICY IF EXISTS "Users can view their own NFC transactions" ON nfc_transactions;
DROP POLICY IF EXISTS "Event admins can view NFC transactions for their events" ON nfc_transactions;

CREATE POLICY "Users can view their own NFC transactions in their organization"
  ON nfc_transactions FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM nfc_bands
      WHERE nfc_bands.id = nfc_transactions.nfc_band_id
        AND nfc_bands.user_id = auth.uid()
    )
  );

CREATE POLICY "Event admins can view NFC transactions for their events"
  ON nfc_transactions FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM nfc_bands
        JOIN user_roles ON user_roles.event_id = nfc_bands.event_id
        WHERE nfc_bands.id = nfc_transactions.nfc_band_id
          AND user_roles.user_id = auth.uid()
          AND user_roles.role = 'event_admin'::user_role
      )
      OR is_super_admin(auth.uid())
    )
  );

-- Update discounts policies
DROP POLICY IF EXISTS "Public can view active discounts for published events" ON discounts;
DROP POLICY IF EXISTS "Event admins can manage discounts for their events" ON discounts;

CREATE POLICY "Public can view active discounts in their organization"
  ON discounts FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      event_id IS NULL
      OR EXISTS (
        SELECT 1 FROM events
        WHERE events.id = discounts.event_id
          AND events.status IN ('published', 'live')
          AND events.deleted_at IS NULL
      )
    )
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW())
  );

CREATE POLICY "Event admins can manage discounts for their events"
  ON discounts FOR ALL
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.event_id = discounts.event_id
          AND user_roles.user_id = auth.uid()
          AND user_roles.role = 'event_admin'::user_role
      )
      OR is_super_admin(auth.uid())
    )
  );

-- Update event expenses policies
DROP POLICY IF EXISTS "Event admins can view expenses for their events" ON event_expenses;
DROP POLICY IF EXISTS "Accounting can view all event expenses" ON event_expenses;

CREATE POLICY "Event admins can view expenses for their events"
  ON event_expenses FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.event_id = event_expenses.event_id
          AND user_roles.user_id = auth.uid()
          AND user_roles.role = 'event_admin'::user_role
      )
      OR is_super_admin(auth.uid())
    )
  );

CREATE POLICY "Accounting can view all event expenses in their organization"
  ON event_expenses FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      user_has_role(auth.uid(), 'accounting')
      OR is_super_admin(auth.uid())
    )
  );

-- Update audit logs policies with tenant isolation
DROP POLICY IF EXISTS "Only admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Accounting can view audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs in their organization"
  ON audit_logs FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      is_super_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
          AND user_roles.role IN ('super_admin'::user_role, 'event_admin'::user_role)
      )
    )
  );

CREATE POLICY "Accounting can view audit logs in their organization"
  ON audit_logs FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      user_has_role(auth.uid(), 'accounting')
      OR is_super_admin(auth.uid())
    )
  );

-- Update user_roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Event admins can view roles for their events" ON user_roles;

CREATE POLICY "Users can view their own roles in their organization"
  ON user_roles FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Super admins can view all roles in their organization"
  ON user_roles FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND is_super_admin(auth.uid())
  );

CREATE POLICY "Event admins can view roles for their events"
  ON user_roles FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      event_id IS NULL
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.event_id = user_roles.event_id
          AND ur.user_id = auth.uid()
          AND ur.role = 'event_admin'::user_role
      )
      OR is_super_admin(auth.uid())
    )
  );

-- Update themes policies
DROP POLICY IF EXISTS "Public can view ticket types for published events" ON ticket_types;
DROP POLICY IF EXISTS "Event admins can manage ticket types for their events" ON ticket_types;

CREATE POLICY "Public can view ticket types for published events"
  ON ticket_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_types.event_id
        AND events.status IN ('published', 'live')
        AND events.deleted_at IS NULL
        AND events.organization_id = get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Event admins can manage ticket types for their events"
  ON ticket_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      JOIN user_roles ON user_roles.event_id = events.id
      WHERE events.id = ticket_types.event_id
        AND events.organization_id = get_user_organization_id(auth.uid())
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
    )
    OR is_super_admin(auth.uid())
  );

