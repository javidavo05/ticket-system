-- Theme Assets RLS Policies
-- Row Level Security policies for theme_assets table
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/024_theme_assets_rls.sql

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view theme assets" ON theme_assets;
DROP POLICY IF EXISTS "Event admins can manage theme assets" ON theme_assets;
DROP POLICY IF EXISTS "Organization admins can manage theme assets" ON theme_assets;

-- Public can view assets for active, published themes
CREATE POLICY "Public can view theme assets"
  ON theme_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM themes
      WHERE themes.id = theme_assets.theme_id
        AND themes.is_active = true
        AND (themes.deprecated_at IS NULL OR themes.deprecated_at > NOW())
        AND (
          (themes.event_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM events
            WHERE events.id = themes.event_id
              AND events.status IN ('published', 'live')
              AND events.deleted_at IS NULL
          ))
          OR (themes.is_default = true AND themes.organization_id IS NOT NULL)
          OR (themes.event_id IS NULL AND themes.organization_id IS NULL)
        )
    )
  );

-- Event admins can manage assets for their event themes
CREATE POLICY "Event admins can manage theme assets"
  ON theme_assets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM themes
      JOIN events ON events.id = themes.event_id
      JOIN user_roles ON user_roles.event_id = events.id
      WHERE themes.id = theme_assets.theme_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role = 'event_admin'::user_role
        AND themes.organization_id = get_user_organization_id(auth.uid())
    )
    OR is_super_admin(auth.uid())
  );

-- Organization admins can manage assets for their organization themes
CREATE POLICY "Organization admins can manage theme assets"
  ON theme_assets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM themes
      WHERE themes.id = theme_assets.theme_id
        AND themes.organization_id = get_user_organization_id(auth.uid())
    )
    OR is_super_admin(auth.uid())
  );

-- Add comments for documentation
COMMENT ON POLICY "Public can view theme assets" ON theme_assets IS 'Public can view assets for active, published themes';
COMMENT ON POLICY "Event admins can manage theme assets" ON theme_assets IS 'Event admins can manage assets for themes of events they administer';
COMMENT ON POLICY "Organization admins can manage theme assets" ON theme_assets IS 'Organization admins can manage assets for their organization themes';
