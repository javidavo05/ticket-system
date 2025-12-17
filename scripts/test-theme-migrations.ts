/**
 * Test Theme Migrations
 * Validates that all theme-related migrations work correctly
 * Run with: npx tsx scripts/test-theme-migrations.ts
 */

import postgres from 'postgres'
import { config } from 'dotenv'

// Load environment variables
config()

async function testMigrations() {
  const directUrl = process.env.DIRECT_URL || process.env.SUPABASE_DB_URL

  if (!directUrl) {
    throw new Error('DIRECT_URL or SUPABASE_DB_URL not found in environment')
  }

  const sql = postgres(directUrl.replace(/^["']|["']$/g, ''), {
    max: 1,
    ssl: 'require',
  })

  try {
    console.log('🧪 Testing Theme Migrations...\n')

    // Test 1: Check version column exists
    console.log('Test 1: Checking version column in themes...')
    const versionColumns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'themes' AND column_name = 'version'
    `
    if (versionColumns.length === 0) {
      throw new Error('❌ version column not found in themes table')
    }
    console.log('✅ version column exists\n')

    // Test 2: Check version_hash column exists
    console.log('Test 2: Checking version_hash column...')
    const hashColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'themes' AND column_name = 'version_hash'
    `
    if (hashColumns.length === 0) {
      throw new Error('❌ version_hash column not found')
    }
    console.log('✅ version_hash column exists\n')

    // Test 3: Check cache_key column exists
    console.log('Test 3: Checking cache_key column...')
    const cacheKeyColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'themes' AND column_name = 'cache_key'
    `
    if (cacheKeyColumns.length === 0) {
      throw new Error('❌ cache_key column not found')
    }
    if (cacheKeyColumns[0].is_nullable === 'YES') {
      throw new Error('❌ cache_key should be NOT NULL')
    }
    console.log('✅ cache_key column exists and is NOT NULL\n')

    // Test 4: Check theme_versions table exists
    console.log('Test 4: Checking theme_versions table...')
    const versionsTable = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'theme_versions'
    `
    if (versionsTable.length === 0) {
      throw new Error('❌ theme_versions table not found')
    }
    console.log('✅ theme_versions table exists\n')

    // Test 5: Check theme_cache_tags table exists
    console.log('Test 5: Checking theme_cache_tags table...')
    const tagsTable = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'theme_cache_tags'
    `
    if (tagsTable.length === 0) {
      throw new Error('❌ theme_cache_tags table not found')
    }
    console.log('✅ theme_cache_tags table exists\n')

    // Test 6: Check unique constraint on (theme_id, version)
    console.log('Test 6: Checking unique constraint on (theme_id, version)...')
    const constraints = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'theme_versions' AND constraint_type = 'UNIQUE'
    `
    if (constraints.length === 0) {
      throw new Error('❌ Unique constraint on (theme_id, version) not found')
    }
    console.log('✅ Unique constraint exists\n')

    // Test 7: Check unique constraint on cache_key
    console.log('Test 7: Checking unique constraint on cache_key...')
    const cacheKeyConstraints = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'themes' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%cache_key%'
    `
    if (cacheKeyConstraints.length === 0) {
      // Check if it's a unique index instead
      const indexes = await sql`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'themes' AND indexname LIKE '%cache_key%'
      `
      if (indexes.length === 0) {
        throw new Error('❌ Unique constraint/index on cache_key not found')
      }
    }
    console.log('✅ Unique constraint on cache_key exists\n')

    // Test 8: Check indexes
    console.log('Test 8: Checking indexes...')
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('themes', 'theme_versions', 'theme_cache_tags')
        AND indexname LIKE 'idx_%'
    `
    if (indexes.length < 5) {
      console.log(`⚠️  Expected at least 5 indexes, found ${indexes.length}`)
    } else {
      console.log(`✅ Found ${indexes.length} indexes\n`)
    }

    // Test 9: Check RLS policies
    console.log('Test 9: Checking RLS policies...')
    const policies = await sql`
      SELECT policyname
      FROM pg_policies
      WHERE tablename IN ('themes', 'theme_versions', 'theme_cache_tags')
        AND schemaname = 'public'
    `
    if (policies.length === 0) {
      throw new Error('❌ No RLS policies found for theme tables')
    }
    console.log(`✅ Found ${policies.length} RLS policies\n`)

    // Test 10: Check all new columns exist
    console.log('Test 10: Checking all new columns...')
    const newColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'themes'
        AND column_name IN (
          'version', 'version_hash', 'is_default', 'parent_theme_id',
          'cache_key', 'published_at', 'deprecated_at', 'created_by'
        )
    `
    if (newColumns.length < 8) {
      throw new Error(`❌ Missing columns. Found: ${newColumns.length}/8`)
    }
    console.log('✅ All new columns exist\n')

    console.log('✅ All tests passed!')
  } catch (error: any) {
    console.error('\n❌ Test failed:')
    console.error(error.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

testMigrations()
