-- Theme RLS Policies
-- Row Level Security policies for themes with versioning support
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/022_theme_rls.sql

-- Drop existing theme policies if they exist
DROP POLICY IF EXISTS "Public can view active themes" ON themes;
DROP POLICY IF EXISTS "Event admins can manage themes for their events" ON themes;
DROP POLICY IF EXISTS "Organization admins can manage themes for their organization" ON themes;

-- Themes policies
-- Public can view active, published themes
CREATE POLICY "Public can view active themes"
  ON themes FOR SELECT
  USING (
    is_active = true
    AND (deprecated_at IS NULL OR deprecated_at > NOW())
    AND (
      -- Event themes: visible if event is published
      (event_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM events
        WHERE events.id = themes.event_id
          AND events.status IN ('published', 'live')
          AND events.deleted_at IS NULL
      ))
      -- Organization default themes: always visible if active
      OR (is_default = true AND organization_id IS NOT NULL)
      -- Global default themes
      OR (event_id IS NULL AND organization_id IS NULL)
    )
  );

-- Event admins can view and manage themes for their events
CREATE POLICY "Event admins can manage themes for their events"
  ON themes FOR ALL
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM events
        JOIN user_roles ON user_roles.event_id = events.id
        WHERE events.id = themes.event_id
          AND user_roles.user_id = auth.uid()
          AND user_roles.role = 'event_admin'::user_role
      )
      OR is_super_admin(auth.uid())
    )
  );

-- Organization admins can manage themes for their organization
CREATE POLICY "Organization admins can manage organization themes"
  ON themes FOR ALL
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      -- Can manage default themes for their organization
      (is_default = true AND organization_id IS NOT NULL)
      -- Can manage event themes if they're event admins
      OR EXISTS (
        SELECT 1 FROM events
        JOIN user_roles ON user_roles.event_id = events.id
        WHERE events.id = themes.event_id
          AND events.organization_id = get_user_organization_id(auth.uid())
          AND user_roles.user_id = auth.uid()
          AND user_roles.role = 'event_admin'::user_role
      )
      OR is_super_admin(auth.uid())
    )
  );

-- Super admins can manage all themes
CREATE POLICY "Super admins can manage all themes"
  ON themes FOR ALL
  USING (is_super_admin(auth.uid()));

-- Theme versions policies
-- Public cannot view theme versions (internal use only)
-- Event admins can view versions for their event themes
CREATE POLICY "Event admins can view theme versions for their events"
  ON theme_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM themes
      JOIN events ON events.id = themes.event_id
      JOIN user_roles ON user_roles.event_id = events.id
      WHERE themes.id = theme_versions.theme_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
        AND themes.organization_id = get_user_organization_id(auth.uid())
    )
    OR is_super_admin(auth.uid())
  );

-- Organization admins can view versions for their organization themes
CREATE POLICY "Organization admins can view theme versions"
  ON theme_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM themes
      WHERE themes.id = theme_versions.theme_id
        AND themes.organization_id = get_user_organization_id(auth.uid())
    )
    OR is_super_admin(auth.uid())
  );

-- Only service role can insert/update theme versions
-- RLS default deny for INSERT/UPDATE ensures only service role can modify

-- Theme cache tags policies
-- Public cannot view cache tags (internal use only)
-- Event admins can view tags for their event themes
CREATE POLICY "Event admins can view cache tags for their events"
  ON theme_cache_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM themes
      JOIN events ON events.id = themes.event_id
      JOIN user_roles ON user_roles.event_id = events.id
      WHERE themes.id = theme_cache_tags.theme_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
        AND themes.organization_id = get_user_organization_id(auth.uid())
    )
    OR is_super_admin(auth.uid())
  );

-- Organization admins can view tags for their organization themes
CREATE POLICY "Organization admins can view cache tags"
  ON theme_cache_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM themes
      WHERE themes.id = theme_cache_tags.theme_id
        AND themes.organization_id = get_user_organization_id(auth.uid())
    )
    OR is_super_admin(auth.uid())
  );

-- Only service role can insert/update cache tags
-- RLS default deny for INSERT/UPDATE ensures only service role can modify

-- Add comments for documentation
COMMENT ON POLICY "Public can view active themes" ON themes IS 'Public can view active, published themes for published events';
COMMENT ON POLICY "Event admins can manage themes for their events" ON themes IS 'Event admins can manage themes for events they administer';
COMMENT ON POLICY "Organization admins can manage organization themes" ON themes IS 'Organization admins can manage default themes for their organization';
