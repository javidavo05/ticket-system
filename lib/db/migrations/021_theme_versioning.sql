-- Theme Versioning and Metadata Migration
-- Adds versioning, cache tags, and metadata to themes
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/021_theme_versioning.sql

-- Step 1: Add versioning and metadata columns to themes table
ALTER TABLE themes
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS version_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS parent_theme_id UUID REFERENCES themes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cache_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Step 2: Generate cache keys for existing themes
DO $$
DECLARE
  theme_record RECORD;
BEGIN
  FOR theme_record IN SELECT id FROM themes WHERE cache_key IS NULL LOOP
    UPDATE themes
    SET cache_key = 'theme:' || theme_record.id::text || ':v1'
    WHERE id = theme_record.id;
  END LOOP;
END $$;

-- Step 3: Make cache_key NOT NULL after backfilling
ALTER TABLE themes
  ALTER COLUMN cache_key SET NOT NULL;

-- Step 4: Create theme_versions table for version history
CREATE TABLE IF NOT EXISTS theme_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  config JSONB NOT NULL,
  version_hash TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(theme_id, version)
);

-- Step 5: Create theme_cache_tags table for cache invalidation
CREATE TABLE IF NOT EXISTS theme_cache_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(theme_id, tag)
);

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_themes_org_default_active 
  ON themes(organization_id, is_default, is_active) 
  WHERE is_default = true AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_themes_event_active 
  ON themes(event_id, is_active) 
  WHERE event_id IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_themes_version_hash 
  ON themes(version_hash) 
  WHERE version_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_themes_cache_key 
  ON themes(cache_key);

CREATE INDEX IF NOT EXISTS idx_themes_parent_theme 
  ON themes(parent_theme_id) 
  WHERE parent_theme_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_theme_versions_theme_id 
  ON theme_versions(theme_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_theme_versions_version_hash 
  ON theme_versions(version_hash);

CREATE INDEX IF NOT EXISTS idx_theme_cache_tags_theme_id 
  ON theme_cache_tags(theme_id);

CREATE INDEX IF NOT EXISTS idx_theme_cache_tags_tag 
  ON theme_cache_tags(tag);

-- Step 7: Add comments for documentation
COMMENT ON COLUMN themes.version IS 'Current version of the theme';
COMMENT ON COLUMN themes.version_hash IS 'Hash of theme config for change detection';
COMMENT ON COLUMN themes.is_default IS 'Whether this is the default theme for the organization';
COMMENT ON COLUMN themes.parent_theme_id IS 'Parent theme for inheritance';
COMMENT ON COLUMN themes.cache_key IS 'Unique cache key for invalidation';
COMMENT ON COLUMN themes.published_at IS 'Timestamp when theme was published';
COMMENT ON COLUMN themes.deprecated_at IS 'Timestamp when theme was deprecated';
COMMENT ON TABLE theme_versions IS 'Version history of themes for rollback and audit';
COMMENT ON TABLE theme_cache_tags IS 'Cache tags for selective cache invalidation';

-- Step 8: Enable RLS on new tables
ALTER TABLE theme_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_cache_tags ENABLE ROW LEVEL SECURITY;
