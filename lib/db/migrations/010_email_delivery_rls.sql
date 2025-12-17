-- Email Delivery RLS Policies
-- Row Level Security for email_deliveries table
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/010_email_delivery_rls.sql

-- Helper function to check if user can view email delivery
CREATE OR REPLACE FUNCTION can_view_email_delivery(user_id UUID, delivery_org_id UUID, delivery_resource_type TEXT, delivery_resource_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admins can view all
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = can_view_email_delivery.user_id
      AND user_roles.role = 'super_admin'::user_role
  ) THEN
    RETURN true;
  END IF;

  -- Users can view their own emails
  IF delivery_resource_type = 'ticket' THEN
    RETURN EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = delivery_resource_id
        AND (
          tickets.purchaser_id = can_view_email_delivery.user_id
          OR tickets.purchaser_email = (SELECT email FROM users WHERE id = can_view_email_delivery.user_id)
        )
    );
  END IF;

  IF delivery_resource_type = 'payment' THEN
    RETURN EXISTS (
      SELECT 1 FROM payments
      WHERE payments.id = delivery_resource_id
        AND payments.user_id = can_view_email_delivery.user_id
    );
  END IF;

  -- Event admins can view emails for their events
  IF delivery_resource_type = 'ticket' THEN
    RETURN EXISTS (
      SELECT 1 FROM tickets
      JOIN user_roles ON user_roles.event_id = tickets.event_id
      WHERE tickets.id = delivery_resource_id
        AND user_roles.user_id = can_view_email_delivery.user_id
        AND user_roles.role = 'event_admin'::user_role
    );
  END IF;

  -- Accounting can view all emails in their organization
  IF delivery_org_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM users
      JOIN user_roles ON user_roles.user_id = users.id
      WHERE users.id = can_view_email_delivery.user_id
        AND users.organization_id = delivery_org_id
        AND user_roles.role = 'accounting'::user_role
    );
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "Users can view their own email deliveries"
  ON email_deliveries FOR SELECT
  USING (
    can_view_email_delivery(auth.uid(), organization_id, resource_type, resource_id)
  );

CREATE POLICY "Service role can manage all email deliveries"
  ON email_deliveries FOR ALL
  USING (true) -- RLS is bypassed for service role client
  WITH CHECK (true);

