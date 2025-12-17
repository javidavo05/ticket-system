-- Promoter Groups RLS Policies
-- Row Level Security for ticket_groups and ticket_assignments tables
-- Run this migration using: npm run run:migrations

-- Ensure tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_groups') THEN
    RAISE EXCEPTION 'Table ticket_groups does not exist. Please run migration 014_promoter_groups.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_assignments') THEN
    RAISE EXCEPTION 'Table ticket_assignments does not exist. Please run migration 014_promoter_groups.sql first.';
  END IF;
END $$;

-- Helper function to check if user can view ticket group
CREATE OR REPLACE FUNCTION can_view_ticket_group(user_id UUID, group_promoter_id UUID, group_event_id UUID, group_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admins can view all
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = can_view_ticket_group.user_id
      AND user_roles.role = 'super_admin'::user_role
  ) THEN
    RETURN true;
  END IF;

  -- Promoters can view their own groups
  IF group_promoter_id = can_view_ticket_group.user_id THEN
    RETURN true;
  END IF;

  -- Event admins can view groups for their events
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = can_view_ticket_group.user_id
      AND user_roles.role = 'event_admin'::user_role
      AND (
        user_roles.event_id = group_event_id
        OR user_roles.event_id IS NULL
      )
  ) THEN
    RETURN true;
  END IF;

  -- Accounting can view groups for their organization
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = can_view_ticket_group.user_id
      AND user_roles.role = 'accounting'::user_role
      AND (
        user_roles.organization_id = group_org_id
        OR user_roles.organization_id IS NULL
      )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can manage ticket group
CREATE OR REPLACE FUNCTION can_manage_ticket_group(user_id UUID, group_promoter_id UUID, group_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admins can manage all
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = can_manage_ticket_group.user_id
      AND user_roles.role = 'super_admin'::user_role
  ) THEN
    RETURN true;
  END IF;

  -- Promoters can manage their own groups
  IF group_promoter_id = can_manage_ticket_group.user_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can view ticket assignment
CREATE OR REPLACE FUNCTION can_view_ticket_assignment(user_id UUID, assignment_promoter_id UUID, assignment_group_id UUID, assignment_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  group_promoter_id UUID;
  group_event_id UUID;
BEGIN
  -- Super admins can view all
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = can_view_ticket_assignment.user_id
      AND user_roles.role = 'super_admin'::user_role
  ) THEN
    RETURN true;
  END IF;

  -- Get group info if assignment has group
  IF assignment_group_id IS NOT NULL THEN
    SELECT promoter_id, event_id INTO group_promoter_id, group_event_id
    FROM ticket_groups
    WHERE id = assignment_group_id;

    -- Use group permissions
    RETURN can_view_ticket_group(user_id, group_promoter_id, group_event_id, assignment_org_id);
  END IF;

  -- Promoters can view their own assignments
  IF assignment_promoter_id = can_view_ticket_assignment.user_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS ticket_groups_select_policy ON ticket_groups;
DROP POLICY IF EXISTS ticket_groups_insert_policy ON ticket_groups;
DROP POLICY IF EXISTS ticket_groups_update_policy ON ticket_groups;
DROP POLICY IF EXISTS ticket_groups_delete_policy ON ticket_groups;

DROP POLICY IF EXISTS ticket_assignments_select_policy ON ticket_assignments;
DROP POLICY IF EXISTS ticket_assignments_insert_policy ON ticket_assignments;
DROP POLICY IF EXISTS ticket_assignments_update_policy ON ticket_assignments;
DROP POLICY IF EXISTS ticket_assignments_delete_policy ON ticket_assignments;

-- RLS Policies for ticket_groups

-- Select policy: Users can view groups they have access to
CREATE POLICY ticket_groups_select_policy ON ticket_groups
  FOR SELECT
  USING (
    can_view_ticket_group(
      auth.uid(),
      promoter_id,
      event_id,
      organization_id
    )
  );

-- Insert policy: Only promoters and super admins can create groups
CREATE POLICY ticket_groups_insert_policy ON ticket_groups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND (
          user_roles.role = 'super_admin'::user_role
          OR user_roles.role = 'promoter'::user_role
        )
    )
    AND promoter_id = auth.uid()
  );

-- Update policy: Only promoters can update their own groups, or super admins
CREATE POLICY ticket_groups_update_policy ON ticket_groups
  FOR UPDATE
  USING (
    can_manage_ticket_group(
      auth.uid(),
      promoter_id,
      organization_id
    )
  )
  WITH CHECK (
    can_manage_ticket_group(
      auth.uid(),
      promoter_id,
      organization_id
    )
  );

-- Delete policy: Only super admins can delete groups (soft delete via cancellation)
CREATE POLICY ticket_groups_delete_policy ON ticket_groups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'super_admin'::user_role
    )
  );

-- RLS Policies for ticket_assignments

-- Select policy: Users can view assignments they have access to
CREATE POLICY ticket_assignments_select_policy ON ticket_assignments
  FOR SELECT
  USING (
    can_view_ticket_assignment(
      auth.uid(),
      promoter_id,
      ticket_group_id,
      COALESCE(
        (SELECT organization_id FROM ticket_groups WHERE id = ticket_group_id),
        (SELECT organization_id FROM tickets WHERE id = ticket_id)
      )
    )
  );

-- Insert policy: Only promoters can create assignments for their groups
CREATE POLICY ticket_assignments_insert_policy ON ticket_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND (
          user_roles.role = 'super_admin'::user_role
          OR user_roles.role = 'promoter'::user_role
        )
    )
    AND promoter_id = auth.uid()
    AND assigned_by = auth.uid()
    AND (
      ticket_group_id IS NULL
      OR EXISTS (
        SELECT 1 FROM ticket_groups
        WHERE id = ticket_group_id
          AND promoter_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM tickets
      WHERE id = ticket_id
        AND (
          promoter_id = auth.uid()
          OR ticket_group_id = ticket_assignments.ticket_group_id
        )
    )
  );

-- Update policy: Only promoters can update their own assignments
CREATE POLICY ticket_assignments_update_policy ON ticket_assignments
  FOR UPDATE
  USING (
    can_manage_ticket_group(
      auth.uid(),
      promoter_id,
      COALESCE(
        (SELECT organization_id FROM ticket_groups WHERE id = ticket_group_id),
        (SELECT organization_id FROM tickets WHERE id = ticket_id)
      )
    )
  )
  WITH CHECK (
    can_manage_ticket_group(
      auth.uid(),
      promoter_id,
      COALESCE(
        (SELECT organization_id FROM ticket_groups WHERE id = ticket_group_id),
        (SELECT organization_id FROM tickets WHERE id = ticket_id)
      )
    )
  );

-- Delete policy: Only promoters can delete their own assignments, or super admins
CREATE POLICY ticket_assignments_delete_policy ON ticket_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND (
          user_roles.role = 'super_admin'::user_role
          OR (
            user_roles.role = 'promoter'::user_role
            AND promoter_id = auth.uid()
          )
        )
    )
  );

