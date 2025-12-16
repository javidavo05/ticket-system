-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(user_id UUID, role_name TEXT, event_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  IF event_id IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = user_has_role.user_id
        AND user_roles.role = role_name::user_role
        AND user_roles.event_id IS NULL
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = user_has_role.user_id
        AND user_roles.role = role_name::user_role
        AND (user_roles.event_id = user_has_role.event_id OR user_roles.event_id IS NULL)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role(user_id, 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Event admins can view users who purchased tickets for their events"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      JOIN events ON tickets.event_id = events.id
      JOIN user_roles ON user_roles.event_id = events.id
      WHERE tickets.purchaser_id = users.id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
    )
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Events policies
CREATE POLICY "Public can view published events"
  ON events FOR SELECT
  USING (status IN ('published', 'live') AND deleted_at IS NULL);

CREATE POLICY "Event admins can manage their events"
  ON events FOR ALL
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.event_id = events.id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
    )
    OR is_super_admin(auth.uid())
  );

-- Tickets policies
CREATE POLICY "Users can view their own tickets"
  ON tickets FOR SELECT
  USING (purchaser_id = auth.uid() OR purchaser_email = (SELECT email FROM users WHERE id = auth.uid()));

CREATE POLICY "Event admins can view tickets for their events"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.event_id = tickets.event_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
    )
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Scanners can view tickets for their assigned events"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.event_id = tickets.event_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'scanner'::user_role
    )
  );

CREATE POLICY "Authenticated users can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Ticket scans policies
CREATE POLICY "Scanners can insert scans for their assigned events"
  ON ticket_scans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets
      JOIN user_roles ON user_roles.event_id = tickets.event_id
      WHERE tickets.id = ticket_scans.ticket_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'scanner'::user_role
    )
  );

CREATE POLICY "Event admins can view scans for their events"
  ON ticket_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      JOIN user_roles ON user_roles.event_id = tickets.event_id
      WHERE tickets.id = ticket_scans.ticket_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
    )
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Users can view scans for their own tickets"
  ON ticket_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_scans.ticket_id
        AND tickets.purchaser_id = auth.uid()
    )
  );

-- Payments policies
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Event admins can view payments for their events"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payment_items
      JOIN tickets ON payment_items.ticket_id = tickets.id
      JOIN user_roles ON user_roles.event_id = tickets.event_id
      WHERE payment_items.payment_id = payments.id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
    )
    OR is_super_admin(auth.uid())
  );

-- Wallets policies
CREATE POLICY "Users can view their own wallet"
  ON wallets FOR SELECT
  USING (user_id = auth.uid());

-- Wallet transactions policies
CREATE POLICY "Users can view their own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (user_id = auth.uid());

-- NFC bands policies
CREATE POLICY "Users can view their own NFC bands"
  ON nfc_bands FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Event admins can view NFC bands for their events"
  ON nfc_bands FOR SELECT
  USING (
    (event_id IS NULL OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.event_id = nfc_bands.event_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
    ))
    OR is_super_admin(auth.uid())
  );

-- Audit logs policies
CREATE POLICY "Only admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('super_admin'::user_role, 'event_admin'::user_role)
    )
  );

-- Note: Service role key should be used for INSERT operations on protected tables
-- These policies are for SELECT/UPDATE/DELETE operations

