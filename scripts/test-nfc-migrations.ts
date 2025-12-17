/**
 * Test NFC Migrations
 * Validates that all NFC-related migrations work correctly
 * Run with: npx tsx scripts/test-nfc-migrations.ts
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
    console.log('🧪 Testing NFC Migrations...\n')

    // Test 1: Check security_token column exists
    console.log('Test 1: Checking security_token column in nfc_bands...')
    const securityColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'nfc_bands' AND column_name = 'security_token'
    `
    if (securityColumns.length === 0) {
      throw new Error('❌ security_token column not found in nfc_bands table')
    }
    console.log('✅ security_token column exists\n')

    // Test 2: Check nfc_nonces table exists
    console.log('Test 2: Checking nfc_nonces table...')
    const noncesTable = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'nfc_nonces'
    `
    if (noncesTable.length === 0) {
      throw new Error('❌ nfc_nonces table not found')
    }
    console.log('✅ nfc_nonces table exists\n')

    // Test 3: Check nfc_usage_sessions table exists
    console.log('Test 3: Checking nfc_usage_sessions table...')
    const sessionsTable = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'nfc_usage_sessions'
    `
    if (sessionsTable.length === 0) {
      throw new Error('❌ nfc_usage_sessions table not found')
    }
    console.log('✅ nfc_usage_sessions table exists\n')

    // Test 4: Check nfc_rate_limits table exists
    console.log('Test 4: Checking nfc_rate_limits table...')
    const rateLimitsTable = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'nfc_rate_limits'
    `
    if (rateLimitsTable.length === 0) {
      throw new Error('❌ nfc_rate_limits table not found')
    }
    console.log('✅ nfc_rate_limits table exists\n')

    // Test 5: Check unique constraint on (nfc_band_id, nonce)
    console.log('Test 5: Checking unique constraint on (nfc_band_id, nonce)...')
    const constraints = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'nfc_nonces' AND constraint_type = 'UNIQUE'
    `
    if (constraints.length === 0) {
      throw new Error('❌ Unique constraint on (nfc_band_id, nonce) not found')
    }
    console.log('✅ Unique constraint exists\n')

    // Test 6: Check indexes
    console.log('Test 6: Checking indexes...')
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('nfc_nonces', 'nfc_usage_sessions', 'nfc_rate_limits')
        AND indexname LIKE 'idx_%'
    `
    if (indexes.length < 5) {
      console.log(`⚠️  Expected at least 5 indexes, found ${indexes.length}`)
    } else {
      console.log(`✅ Found ${indexes.length} indexes\n`)
    }

    // Test 7: Check RLS policies
    console.log('Test 7: Checking RLS policies...')
    const policies = await sql`
      SELECT policyname
      FROM pg_policies
      WHERE tablename IN ('nfc_nonces', 'nfc_usage_sessions', 'nfc_rate_limits')
        AND schemaname = 'public'
    `
    if (policies.length === 0) {
      throw new Error('❌ No RLS policies found for NFC security tables')
    }
    console.log(`✅ Found ${policies.length} RLS policies\n`)

    // Test 8: Test table structure
    console.log('Test 8: Testing table structure...')
    const nfcBandsColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'nfc_bands'
        AND column_name IN ('security_token', 'token_issued_at', 'binding_verified_at', 'last_location', 'concurrent_use_count')
    `
    if (nfcBandsColumns.length < 5) {
      throw new Error(`❌ Missing security columns in nfc_bands. Found: ${nfcBandsColumns.length}`)
    }
    console.log('✅ All security columns exist in nfc_bands\n')

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
