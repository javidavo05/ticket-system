-- Ticket State Improvements Migration
-- Adds 'issued' status and revocation tracking fields
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/008_ticket_state_improvements.sql

-- Add 'issued' status to ticket_status enum
-- Note: PostgreSQL doesn't support removing enum values, so we need to check if it exists first
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'issued' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ticket_status')
    ) THEN
        ALTER TYPE ticket_status ADD VALUE 'issued';
    END IF;
END $$;

-- Add revocation tracking fields to tickets table (optional, for better audit trail)
ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id);

-- Create index for revoked tickets queries
CREATE INDEX IF NOT EXISTS idx_tickets_revoked_at ON tickets(revoked_at) WHERE revoked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_revoked_by ON tickets(revoked_by) WHERE revoked_by IS NOT NULL;

