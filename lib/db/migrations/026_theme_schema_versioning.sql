-- Theme Schema Versioning Migration
-- Adds schema_version tracking to themes and theme_versions
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/026_theme_schema_versioning.sql

-- Step 1: Add schema_version to themes table
ALTER TABLE themes
  ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '1.0.0' NOT NULL;

-- Step 2: Add schema_version to theme_versions table
ALTER TABLE theme_versions
  ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '1.0.0' NOT NULL;

-- Step 3: Create indexes for schema version queries
CREATE INDEX IF NOT EXISTS idx_themes_schema_version 
  ON themes(schema_version);

CREATE INDEX IF NOT EXISTS idx_theme_versions_schema_version 
  ON theme_versions(schema_version);

-- Step 4: Add comments for documentation
COMMENT ON COLUMN themes.schema_version IS 'Token contract schema version (e.g., "1.0.0")';
COMMENT ON COLUMN theme_versions.schema_version IS 'Token contract schema version for this theme version';
