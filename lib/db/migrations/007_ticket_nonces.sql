-- Ticket Nonces Table for Replay Attack Prevention
-- This table tracks nonces used in QR codes to prevent replay attacks
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/007_ticket_nonces.sql

CREATE TABLE IF NOT EXISTS ticket_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  nonce TEXT NOT NULL,
  scan_id UUID REFERENCES ticket_scans(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(ticket_id, nonce)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ticket_nonces_ticket_id ON ticket_nonces(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_nonces_nonce ON ticket_nonces(nonce);
CREATE INDEX IF NOT EXISTS idx_ticket_nonces_scan_id ON ticket_nonces(scan_id) WHERE scan_id IS NOT NULL;

-- RLS policies
ALTER TABLE ticket_nonces ENABLE ROW LEVEL SECURITY;

-- Scanners can view nonces for tickets they scan
CREATE POLICY "Scanners can view nonces for scanned tickets"
  ON ticket_nonces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ticket_scans
      WHERE ticket_scans.id = ticket_nonces.scan_id
        AND ticket_scans.scanned_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM tickets
      JOIN user_roles ON user_roles.event_id = tickets.event_id
      WHERE tickets.id = ticket_nonces.ticket_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role IN ('event_admin'::user_role, 'scanner'::user_role)
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = users.id
            AND user_roles.role = 'super_admin'::user_role
        )
    )
  );

-- Only service role can insert/update nonces (via application code)
-- This is handled by RLS default deny for INSERT/UPDATE

