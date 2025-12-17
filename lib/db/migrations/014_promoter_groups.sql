-- Promoter Groups Schema
-- Adds support for promoter-based group ticket sales
-- Run this migration using: npm run run:migrations

-- Create ticket_groups table
CREATE TABLE IF NOT EXISTS ticket_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE NOT NULL,
  promoter_id UUID REFERENCES users(id) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  group_name TEXT,
  total_tickets INTEGER NOT NULL,
  tickets_assigned INTEGER DEFAULT 0 NOT NULL,
  tickets_sold INTEGER DEFAULT 0 NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  amount_paid NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  allows_partial BOOLEAN DEFAULT true NOT NULL,
  min_partial_amount NUMERIC(10, 2),
  payment_id UUID REFERENCES payments(id),
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add ticket_group_id to tickets table
ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS ticket_group_id UUID REFERENCES ticket_groups(id) ON DELETE SET NULL;

-- Create ticket_assignments table for detailed tracking
CREATE TABLE IF NOT EXISTS ticket_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  ticket_group_id UUID REFERENCES ticket_groups(id) ON DELETE CASCADE,
  promoter_id UUID REFERENCES users(id) NOT NULL,
  assigned_to_email TEXT,
  assigned_to_name TEXT,
  assigned_to_phone TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  assigned_by UUID REFERENCES users(id) NOT NULL,
  status TEXT DEFAULT 'assigned' NOT NULL CHECK (status IN ('assigned', 'confirmed', 'cancelled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add constraints to ticket_groups
ALTER TABLE ticket_groups 
  ADD CONSTRAINT check_tickets_assigned_not_exceeds_total 
  CHECK (tickets_assigned <= total_tickets);

ALTER TABLE ticket_groups 
  ADD CONSTRAINT check_tickets_sold_not_exceeds_total 
  CHECK (tickets_sold <= total_tickets);

ALTER TABLE ticket_groups 
  ADD CONSTRAINT check_tickets_sold_not_exceeds_assigned 
  CHECK (tickets_sold <= tickets_assigned);

ALTER TABLE ticket_groups 
  ADD CONSTRAINT check_amount_paid_not_exceeds_total 
  CHECK (amount_paid <= total_amount);

ALTER TABLE ticket_groups 
  ADD CONSTRAINT check_amount_paid_non_negative 
  CHECK (amount_paid >= 0);

ALTER TABLE ticket_groups 
  ADD CONSTRAINT check_total_tickets_positive 
  CHECK (total_tickets > 0);

ALTER TABLE ticket_groups 
  ADD CONSTRAINT check_total_amount_positive 
  CHECK (total_amount > 0);

-- Indexes for ticket_groups
CREATE INDEX IF NOT EXISTS idx_ticket_groups_promoter ON ticket_groups(promoter_id, status);
CREATE INDEX IF NOT EXISTS idx_ticket_groups_event ON ticket_groups(event_id, status);
CREATE INDEX IF NOT EXISTS idx_ticket_groups_payment ON ticket_groups(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_groups_organization ON ticket_groups(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_groups_ticket_type ON ticket_groups(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_ticket_groups_status ON ticket_groups(status);
CREATE INDEX IF NOT EXISTS idx_ticket_groups_created_at ON ticket_groups(created_at DESC);

-- Indexes for tickets with group
CREATE INDEX IF NOT EXISTS idx_tickets_group ON tickets(ticket_group_id) WHERE ticket_group_id IS NOT NULL;

-- Indexes for ticket_assignments
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_group ON ticket_assignments(ticket_group_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_ticket ON ticket_assignments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_promoter ON ticket_assignments(promoter_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_status ON ticket_assignments(status);
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_email ON ticket_assignments(assigned_to_email) WHERE assigned_to_email IS NOT NULL;

-- Enable RLS (policies will be added in next migration)
ALTER TABLE ticket_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_assignments ENABLE ROW LEVEL SECURITY;

