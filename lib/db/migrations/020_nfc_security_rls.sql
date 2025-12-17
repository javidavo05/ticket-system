-- NFC Security RLS Policies
-- Row Level Security policies for NFC security tables
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/020_nfc_security_rls.sql

-- nfc_nonces policies
CREATE POLICY "Users can view their own NFC nonces"
  ON nfc_nonces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nfc_bands
      WHERE nfc_bands.id = nfc_nonces.nfc_band_id
        AND nfc_bands.user_id = auth.uid()
        AND nfc_bands.organization_id = get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Event admins can view NFC nonces for their events"
  ON nfc_nonces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nfc_bands
      JOIN user_roles ON user_roles.event_id = nfc_bands.event_id
      WHERE nfc_bands.id = nfc_nonces.nfc_band_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
        AND nfc_bands.organization_id = get_user_organization_id(auth.uid())
    )
    OR is_super_admin(auth.uid())
  );

-- Only service role can insert/update nonces (via application code)
-- RLS default deny for INSERT/UPDATE ensures only service role can modify

-- nfc_usage_sessions policies
CREATE POLICY "Users can view their own NFC usage sessions"
  ON nfc_usage_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nfc_bands
      WHERE nfc_bands.id = nfc_usage_sessions.nfc_band_id
        AND nfc_bands.user_id = auth.uid()
        AND nfc_bands.organization_id = get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Event admins can view NFC usage sessions for their events"
  ON nfc_usage_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nfc_bands
      JOIN user_roles ON user_roles.event_id = nfc_bands.event_id
      WHERE nfc_bands.id = nfc_usage_sessions.nfc_band_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
        AND nfc_bands.organization_id = get_user_organization_id(auth.uid())
    )
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Accounting can view all NFC usage sessions in their organization"
  ON nfc_usage_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nfc_bands
      WHERE nfc_bands.id = nfc_usage_sessions.nfc_band_id
        AND nfc_bands.organization_id = get_user_organization_id(auth.uid())
        AND user_has_role(auth.uid(), 'accounting')
    )
    OR is_super_admin(auth.uid())
  );

-- Only service role can insert/update usage sessions
-- RLS default deny for INSERT/UPDATE ensures only service role can modify

-- nfc_rate_limits policies
CREATE POLICY "Users can view their own NFC rate limits"
  ON nfc_rate_limits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nfc_bands
      WHERE nfc_bands.id = nfc_rate_limits.nfc_band_id
        AND nfc_bands.user_id = auth.uid()
        AND nfc_bands.organization_id = get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Event admins can view NFC rate limits for their events"
  ON nfc_rate_limits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nfc_bands
      JOIN user_roles ON user_roles.event_id = nfc_bands.event_id
      WHERE nfc_bands.id = nfc_rate_limits.nfc_band_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
        AND nfc_bands.organization_id = get_user_organization_id(auth.uid())
    )
    OR is_super_admin(auth.uid())
  );

-- Only service role can insert/update rate limits
-- RLS default deny for INSERT/UPDATE ensures only service role can modify

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own NFC nonces" ON nfc_nonces IS 'Users can view nonces for their own NFC bands';
COMMENT ON POLICY "Event admins can view NFC nonces for their events" ON nfc_nonces IS 'Event admins can view nonces for NFC bands in their events';
COMMENT ON POLICY "Users can view their own NFC usage sessions" ON nfc_usage_sessions IS 'Users can view usage sessions for their own NFC bands';
COMMENT ON POLICY "Event admins can view NFC usage sessions for their events" ON nfc_usage_sessions IS 'Event admins can view usage sessions for NFC bands in their events';
COMMENT ON POLICY "Users can view their own NFC rate limits" ON nfc_rate_limits IS 'Users can view rate limits for their own NFC bands';
