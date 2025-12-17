/**
 * Test Enhanced Theme Schema
 * Validates that all enhanced theme schema features work correctly
 * Run with: npx tsx scripts/test-theme-enhanced-schema.ts
 */

import postgres from 'postgres'
import { config } from 'dotenv'

// Load environment variables
config()

async function testEnhancedSchema() {
  const directUrl = process.env.DIRECT_URL || process.env.SUPABASE_DB_URL

  if (!directUrl) {
    throw new Error('DIRECT_URL or SUPABASE_DB_URL not found in environment')
  }

  const sql = postgres(directUrl.replace(/^["']|["']$/g, ''), {
    max: 1,
    ssl: 'require',
  })

  try {
    console.log('🧪 Testing Enhanced Theme Schema...\n')

    // Test 1: Check theme_assets table exists
    console.log('Test 1: Checking theme_assets table...')
    const assetsTable = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'theme_assets'
    `
    if (assetsTable.length === 0) {
      throw new Error('❌ theme_assets table not found')
    }
    console.log('✅ theme_assets table exists\n')

    // Test 2: Check theme_assets columns
    console.log('Test 2: Checking theme_assets columns...')
    const assetsColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'theme_assets'
      ORDER BY ordinal_position
    `
    const requiredColumns = ['id', 'theme_id', 'asset_type', 'file_name', 'mime_type', 'file_size', 'file_data', 'url']
    const foundColumns = assetsColumns.map(c => c.column_name)
    for (const col of requiredColumns) {
      if (!foundColumns.includes(col)) {
        throw new Error(`❌ Missing column: ${col}`)
      }
    }
    console.log('✅ All required columns exist\n')

    // Test 3: Check validate_theme_config function exists
    console.log('Test 3: Checking validate_theme_config function...')
    const validationFunction = await sql`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_name = 'validate_theme_config'
    `
    if (validationFunction.length === 0) {
      throw new Error('❌ validate_theme_config function not found')
    }
    console.log('✅ validate_theme_config function exists\n')

    // Test 4: Test validation function with valid config
    console.log('Test 4: Testing validation function with valid config...')
    const validConfig = {
      colors: {
        primary: { 500: '#000000' },
        secondary: { 500: '#666666' },
        accent: { 500: '#FFD700' },
        background: { default: '#FFFFFF' },
        text: { default: '#000000' },
        success: { 500: '#10B981' },
        error: { 500: '#EF4444' },
        warning: { 500: '#F59E0B' },
        info: { 500: '#3B82F6' },
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      typography: {
        fontFamily: 'Arial',
        headingFont: 'Arial',
        sizes: { base: '1rem' },
        weights: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 },
        lineHeights: { normal: '1.5' },
        letterSpacing: { normal: '0' },
      },
      spacing: {
        tokens: { md: '1rem' },
        scale: [0, 4, 8, 16, 24, 32],
      },
      layout: {
        variant: 'centered',
        heroStyle: 'image',
        breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
        containerWidths: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
        gridColumns: 12,
      },
      animations: {
        enabled: true,
        transitions: { default: '150ms ease-in-out' },
        durations: { normal: '200ms' },
        easings: { easeIn: 'cubic-bezier(0.4, 0, 1, 1)' },
      },
    }
    const validationResult = await sql`
      SELECT validate_theme_config(${sql.json(validConfig)}) as is_valid
    `
    if (!validationResult[0].is_valid) {
      throw new Error('❌ Validation function rejected valid config')
    }
    console.log('✅ Validation function accepts valid config\n')

    // Test 5: Test validation function with invalid config
    console.log('Test 5: Testing validation function with invalid config...')
    const invalidConfig = {
      colors: {},
      typography: {},
    }
    const invalidResult = await sql`
      SELECT validate_theme_config(${sql.json(invalidConfig)}) as is_valid
    `
    if (invalidResult[0].is_valid) {
      throw new Error('❌ Validation function accepted invalid config')
    }
    console.log('✅ Validation function rejects invalid config\n')

    // Test 6: Check CHECK constraints
    console.log('Test 6: Checking CHECK constraints...')
    const constraints = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name IN ('themes', 'theme_versions')
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%config_valid%'
    `
    if (constraints.length < 2) {
      throw new Error(`❌ Missing CHECK constraints. Found: ${constraints.length}/2`)
    }
    console.log('✅ CHECK constraints exist\n')

    // Test 7: Check enhanced indexes
    console.log('Test 7: Checking enhanced indexes...')
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('themes', 'theme_assets')
        AND indexname LIKE 'idx_%'
    `
    const requiredIndexes = [
      'idx_themes_event_active_published',
      'idx_themes_org_default_active_published',
      'idx_themes_config_gin',
      'idx_theme_assets_theme_type',
      'idx_theme_assets_type',
    ]
    const foundIndexes = indexes.map(i => i.indexname)
    for (const idx of requiredIndexes) {
      if (!foundIndexes.includes(idx)) {
        throw new Error(`❌ Missing index: ${idx}`)
      }
    }
    console.log('✅ All required indexes exist\n')

    // Test 8: Check RLS on theme_assets
    console.log('Test 8: Checking RLS on theme_assets...')
    const rlsEnabled = await sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE tablename = 'theme_assets'
        AND schemaname = 'public'
    `
    if (rlsEnabled.length === 0 || !rlsEnabled[0].rowsecurity) {
      throw new Error('❌ RLS not enabled on theme_assets')
    }
    console.log('✅ RLS enabled on theme_assets\n')

    // Test 9: Check RLS policies
    console.log('Test 9: Checking RLS policies...')
    const policies = await sql`
      SELECT policyname
      FROM pg_policies
      WHERE tablename = 'theme_assets'
        AND schemaname = 'public'
    `
    if (policies.length < 3) {
      throw new Error(`❌ Missing RLS policies. Found: ${policies.length}/3`)
    }
    console.log('✅ RLS policies exist\n')

    // Test 10: Check migrate_theme_config function exists
    console.log('Test 10: Checking migrate_theme_config function...')
    const migrateFunction = await sql`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_name = 'migrate_theme_config'
    `
    if (migrateFunction.length === 0) {
      throw new Error('❌ migrate_theme_config function not found')
    }
    console.log('✅ migrate_theme_config function exists\n')

    // Test 11: Test migration function
    console.log('Test 11: Testing migration function...')
    const oldConfig = {
      colors: {
        primary: '#000000',
        secondary: '#666666',
        accent: '#FFD700',
        background: '#FFFFFF',
        text: '#000000',
      },
      typography: {
        fontFamily: 'Arial',
        headingFont: 'Arial',
        sizes: { base: '1rem' },
      },
      layout: {
        variant: 'centered',
        heroStyle: 'image',
      },
      animations: {
        enabled: true,
        transitions: {},
      },
    }
    const migratedConfig = await sql`
      SELECT migrate_theme_config(${sql.json(oldConfig)}) as new_config
    `
    const newConfig = migratedConfig[0].new_config
    if (!newConfig.spacing || !newConfig.spacing.tokens) {
      throw new Error('❌ Migration function did not add spacing')
    }
    if (!newConfig.colors.primary || typeof newConfig.colors.primary !== 'object') {
      throw new Error('❌ Migration function did not convert colors to scale')
    }
    console.log('✅ Migration function works correctly\n')

    console.log('✅ All tests passed!')
  } catch (error: any) {
    console.error('\n❌ Test failed:')
    console.error(error.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

testEnhancedSchema()
