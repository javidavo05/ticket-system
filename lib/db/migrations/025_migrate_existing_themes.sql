-- Migrate Existing Themes to Enhanced Structure
-- Migrates old theme configs to new comprehensive structure
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/025_migrate_existing_themes.sql

-- Function to migrate old theme config to new structure
CREATE OR REPLACE FUNCTION migrate_theme_config(old_config JSONB)
RETURNS JSONB AS $$
DECLARE
  new_config JSONB;
  primary_color TEXT;
  secondary_color TEXT;
  accent_color TEXT;
  bg_color TEXT;
  text_color TEXT;
  typography_config JSONB;
  layout_config JSONB;
  animations_config JSONB;
BEGIN
  -- Extract old colors (handle both old and new formats)
  primary_color := COALESCE(
    old_config->'colors'->>'primary',
    old_config->'colors'->'primary'->>'500',
    '#000000'
  );
  secondary_color := COALESCE(
    old_config->'colors'->>'secondary',
    old_config->'colors'->'secondary'->>'500',
    '#666666'
  );
  accent_color := COALESCE(
    old_config->'colors'->>'accent',
    old_config->'colors'->'accent'->>'500',
    '#FFD700'
  );
  bg_color := COALESCE(
    old_config->'colors'->>'background',
    old_config->'colors'->'background'->>'default',
    '#FFFFFF'
  );
  text_color := COALESCE(
    old_config->'colors'->>'text',
    old_config->'colors'->'text'->>'default',
    '#000000'
  );
  
  -- Check if config is already in new format
  IF old_config->'colors'->'primary' IS NOT NULL AND jsonb_typeof(old_config->'colors'->'primary') = 'object' THEN
    -- Already in new format, just ensure spacing and other enhancements exist
    new_config := old_config;
    
    -- Add spacing if missing
    IF NOT (new_config ? 'spacing') THEN
      new_config := new_config || jsonb_build_object(
        'spacing', jsonb_build_object(
          'tokens', jsonb_build_object(
            'xs', '0.25rem',
            'sm', '0.5rem',
            'md', '1rem',
            'lg', '1.5rem',
            'xl', '2rem',
            '2xl', '3rem',
            '3xl', '4rem'
          ),
          'scale', jsonb_build_array(0, 4, 8, 16, 24, 32, 48, 64, 96, 128)
        )
      );
    END IF;
    
    -- Enhance typography if missing weights/lineHeights/letterSpacing
    typography_config := COALESCE(new_config->'typography', '{}'::jsonb);
    IF NOT (typography_config ? 'weights') THEN
      typography_config := typography_config || jsonb_build_object(
        'weights', jsonb_build_object(
          'light', 300,
          'normal', 400,
          'medium', 500,
          'semibold', 600,
          'bold', 700
        )
      );
    END IF;
    IF NOT (typography_config ? 'lineHeights') THEN
      typography_config := typography_config || jsonb_build_object(
        'lineHeights', jsonb_build_object(
          'tight', '1.25',
          'normal', '1.5',
          'relaxed', '1.75'
        )
      );
    END IF;
    IF NOT (typography_config ? 'letterSpacing') THEN
      typography_config := typography_config || jsonb_build_object(
        'letterSpacing', jsonb_build_object(
          'tight', '-0.025em',
          'normal', '0',
          'wide', '0.025em'
        )
      );
    END IF;
    new_config := new_config || jsonb_build_object('typography', typography_config);
    
    -- Enhance layout if missing breakpoints/containerWidths/gridColumns
    layout_config := COALESCE(new_config->'layout', '{}'::jsonb);
    IF NOT (layout_config ? 'breakpoints') THEN
      layout_config := layout_config || jsonb_build_object(
        'breakpoints', jsonb_build_object(
          'sm', '640px',
          'md', '768px',
          'lg', '1024px',
          'xl', '1280px',
          '2xl', '1536px'
        )
      );
    END IF;
    IF NOT (layout_config ? 'containerWidths') THEN
      layout_config := layout_config || jsonb_build_object(
        'containerWidths', jsonb_build_object(
          'sm', '640px',
          'md', '768px',
          'lg', '1024px',
          'xl', '1280px'
        )
      );
    END IF;
    IF NOT (layout_config ? 'gridColumns') THEN
      layout_config := layout_config || jsonb_build_object('gridColumns', 12);
    END IF;
    new_config := new_config || jsonb_build_object('layout', layout_config);
    
    -- Enhance animations if missing durations/easings
    animations_config := COALESCE(new_config->'animations', '{}'::jsonb);
    IF NOT (animations_config ? 'durations') THEN
      animations_config := animations_config || jsonb_build_object(
        'durations', jsonb_build_object(
          'fast', '100ms',
          'normal', '200ms',
          'slow', '300ms'
        )
      );
    END IF;
    IF NOT (animations_config ? 'easings') THEN
      animations_config := animations_config || jsonb_build_object(
        'easings', jsonb_build_object(
          'easeIn', 'cubic-bezier(0.4, 0, 1, 1)',
          'easeOut', 'cubic-bezier(0, 0, 0.2, 1)',
          'easeInOut', 'cubic-bezier(0.4, 0, 0.2, 1)'
        )
      );
    END IF;
    new_config := new_config || jsonb_build_object('animations', animations_config);
    
    -- Add assets if missing
    IF NOT (new_config ? 'assets') THEN
      new_config := new_config || jsonb_build_object('assets', jsonb_build_object());
    END IF;
    
    RETURN new_config;
  END IF;
  
  -- Build new color structure with scale (simplified - using base color for all shades)
  -- In production, you might want to use a color manipulation library
  new_config := jsonb_build_object(
    'colors', jsonb_build_object(
      'primary', jsonb_build_object(
        '50', primary_color,
        '100', primary_color,
        '200', primary_color,
        '300', primary_color,
        '400', primary_color,
        '500', primary_color,
        '600', primary_color,
        '700', primary_color,
        '800', primary_color,
        '900', primary_color
      ),
      'secondary', jsonb_build_object(
        '50', secondary_color,
        '100', secondary_color,
        '200', secondary_color,
        '300', secondary_color,
        '400', secondary_color,
        '500', secondary_color,
        '600', secondary_color,
        '700', secondary_color,
        '800', secondary_color,
        '900', secondary_color
      ),
      'accent', jsonb_build_object('500', accent_color),
      'background', jsonb_build_object('default', bg_color),
      'text', jsonb_build_object('default', text_color),
      'success', jsonb_build_object('500', '#10B981'),
      'error', jsonb_build_object('500', '#EF4444'),
      'warning', jsonb_build_object('500', '#F59E0B'),
      'info', jsonb_build_object('500', '#3B82F6'),
      'neutral', jsonb_build_object(
        '50', '#F9FAFB',
        '100', '#F3F4F6',
        '200', '#E5E7EB',
        '300', '#D1D5DB',
        '400', '#9CA3AF',
        '500', '#6B7280',
        '600', '#4B5563',
        '700', '#374151',
        '800', '#1F2937',
        '900', '#111827'
      )
    ),
    'typography', COALESCE(old_config->'typography', '{}'::jsonb) || jsonb_build_object(
      'weights', jsonb_build_object(
        'light', 300,
        'normal', 400,
        'medium', 500,
        'semibold', 600,
        'bold', 700
      ),
      'lineHeights', jsonb_build_object(
        'tight', '1.25',
        'normal', '1.5',
        'relaxed', '1.75'
      ),
      'letterSpacing', jsonb_build_object(
        'tight', '-0.025em',
        'normal', '0',
        'wide', '0.025em'
      )
    ),
    'spacing', jsonb_build_object(
      'tokens', jsonb_build_object(
        'xs', '0.25rem',
        'sm', '0.5rem',
        'md', '1rem',
        'lg', '1.5rem',
        'xl', '2rem',
        '2xl', '3rem',
        '3xl', '4rem'
      ),
      'scale', jsonb_build_array(0, 4, 8, 16, 24, 32, 48, 64, 96, 128)
    ),
    'layout', COALESCE(old_config->'layout', '{}'::jsonb) || jsonb_build_object(
      'breakpoints', jsonb_build_object(
        'sm', '640px',
        'md', '768px',
        'lg', '1024px',
        'xl', '1280px',
        '2xl', '1536px'
      ),
      'containerWidths', jsonb_build_object(
        'sm', '640px',
        'md', '768px',
        'lg', '1024px',
        'xl', '1280px'
      ),
      'gridColumns', 12
    ),
    'animations', COALESCE(old_config->'animations', '{}'::jsonb) || jsonb_build_object(
      'durations', jsonb_build_object(
        'fast', '100ms',
        'normal', '200ms',
        'slow', '300ms'
      ),
      'easings', jsonb_build_object(
        'easeIn', 'cubic-bezier(0.4, 0, 1, 1)',
        'easeOut', 'cubic-bezier(0, 0, 0.2, 1)',
        'easeInOut', 'cubic-bezier(0.4, 0, 0.2, 1)'
      )
    ),
    'assets', jsonb_build_object()
  );
  
  RETURN new_config;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing themes (only if config doesn't already have spacing)
UPDATE themes
SET config = migrate_theme_config(config)
WHERE NOT (config ? 'spacing')
  AND is_active = true;

-- Migrate theme_versions (only if config doesn't already have spacing)
UPDATE theme_versions
SET config = migrate_theme_config(config)
WHERE NOT (config ? 'spacing');

-- Add comment
COMMENT ON FUNCTION migrate_theme_config IS 'Migrates old theme config structure to new comprehensive structure with color scales, spacing, enhanced typography/layout/animations';
