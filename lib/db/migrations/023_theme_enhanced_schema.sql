-- Enhanced Theme Schema Migration
-- Adds asset storage, JSONB validation, and optimized indexes
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/023_theme_enhanced_schema.sql

-- Step 1: Create theme_assets table
CREATE TABLE IF NOT EXISTS theme_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'logo_dark', 'favicon', 'background', 'background_mobile', 'og_image', 'custom')),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_data BYTEA NOT NULL,
  url TEXT, -- Optional CDN URL if also stored externally
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(theme_id, asset_type)
);

-- Step 2: Create JSONB validation function
CREATE OR REPLACE FUNCTION validate_theme_config(config JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate required top-level keys
  IF NOT (config ? 'colors' AND config ? 'typography' AND config ? 'layout' AND config ? 'animations') THEN
    RETURN false;
  END IF;
  
  -- Validate colors structure (support both old and new formats)
  IF NOT (config->'colors' ? 'primary') THEN
    RETURN false;
  END IF;
  
  -- Primary can be string (old format) or object (new format)
  IF jsonb_typeof(config->'colors'->'primary') = 'object' THEN
    -- New format: must have at least '500' key
    IF NOT (config->'colors'->'primary' ? '500') THEN
      RETURN false;
    END IF;
  ELSIF jsonb_typeof(config->'colors'->'primary') != 'string' THEN
    -- Must be string or object
    RETURN false;
  END IF;
  
  -- Validate typography structure
  IF NOT (config->'typography' ? 'fontFamily' AND config->'typography' ? 'sizes') THEN
    RETURN false;
  END IF;
  
  -- Validate spacing structure (if present)
  IF config ? 'spacing' THEN
    IF NOT (config->'spacing' ? 'tokens' OR config->'spacing' ? 'scale') THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Validate assets structure (if present)
  IF config ? 'assets' THEN
    -- Assets should be object with optional string values (asset_id references)
    IF jsonb_typeof(config->'assets') != 'object' THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Add CHECK constraints to themes.config
-- Note: We'll make this conditional to avoid breaking existing data
-- First, check if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'themes_config_valid'
  ) THEN
    ALTER TABLE themes
      ADD CONSTRAINT themes_config_valid 
      CHECK (validate_theme_config(config));
  END IF;
END $$;

-- Step 4: Add CHECK constraint to theme_versions.config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'theme_versions_config_valid'
  ) THEN
    ALTER TABLE theme_versions
      ADD CONSTRAINT theme_versions_config_valid 
      CHECK (validate_theme_config(config));
  END IF;
END $$;

-- Step 5: Create indexes for fast theme resolution
-- Composite index for event theme resolution
CREATE INDEX IF NOT EXISTS idx_themes_event_active_published 
  ON themes(event_id, is_active, published_at DESC NULLS LAST)
  WHERE event_id IS NOT NULL AND is_active = true;

-- Composite index for organization default theme resolution
CREATE INDEX IF NOT EXISTS idx_themes_org_default_active_published
  ON themes(organization_id, is_default, is_active, published_at DESC NULLS LAST)
  WHERE organization_id IS NOT NULL AND is_default = true AND is_active = true;

-- GIN index for JSONB config queries (for searching by color values, etc.)
CREATE INDEX IF NOT EXISTS idx_themes_config_gin 
  ON themes USING GIN (config);

-- Index for asset lookups by theme and type
CREATE INDEX IF NOT EXISTS idx_theme_assets_theme_type 
  ON theme_assets(theme_id, asset_type);

-- Index for asset type lookups
CREATE INDEX IF NOT EXISTS idx_theme_assets_type 
  ON theme_assets(asset_type);

-- Step 6: Enable RLS on theme_assets
ALTER TABLE theme_assets ENABLE ROW LEVEL SECURITY;

-- Step 7: Add comments for documentation
COMMENT ON TABLE theme_assets IS 'Binary assets (logos, backgrounds) associated with themes';
COMMENT ON COLUMN theme_assets.asset_type IS 'Type of asset: logo, logo_dark, favicon, background, background_mobile, og_image, custom';
COMMENT ON COLUMN theme_assets.file_data IS 'Binary file data (BYTEA). Recommended max size: 1MB. For larger files, use url field to reference CDN.';
COMMENT ON COLUMN theme_assets.url IS 'Optional CDN URL if asset is also stored externally';
COMMENT ON FUNCTION validate_theme_config IS 'Validates that theme config JSONB has required structure and keys';
