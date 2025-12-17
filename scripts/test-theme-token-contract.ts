/**
 * Test Theme Token Contract
 * Validates that token contract system works correctly
 * Run with: npx tsx scripts/test-theme-token-contract.ts
 */

import postgres from 'postgres'
import { config } from 'dotenv'
import { defaultThemeConfig } from '../config/theme-defaults'
import { getTokenContract, detectSchemaVersion, getLatestContractVersion } from '../lib/services/themes/contract-registry'
import { checkCompatibility } from '../lib/services/themes/compatibility'
import { validateAgainstContract } from '../lib/services/themes/contract-validation'
import { migrateThemeConfig, autoMigrateToLatest } from '../lib/services/themes/migration'
import { validateThemeConfigWithContract } from '../lib/services/themes/validation'

// Load environment variables
config()

async function testTokenContract() {
  const directUrl = process.env.DIRECT_URL || process.env.SUPABASE_DB_URL

  if (!directUrl) {
    throw new Error('DIRECT_URL or SUPABASE_DB_URL not found in environment')
  }

  const sql = postgres(directUrl.replace(/^["']|["']$/g, ''), {
    max: 1,
    ssl: 'require',
  })

  try {
    console.log('🧪 Testing Theme Token Contract...\n')

    // Test 1: Check schema_version column exists
    console.log('Test 1: Checking schema_version column...')
    const schemaVersionColumn = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'themes' AND column_name = 'schema_version'
    `
    if (schemaVersionColumn.length === 0) {
      throw new Error('❌ schema_version column not found in themes table')
    }
    console.log('✅ schema_version column exists\n')

    // Test 2: Check theme_versions has schema_version
    console.log('Test 2: Checking theme_versions schema_version...')
    const versionColumn = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'theme_versions' AND column_name = 'schema_version'
    `
    if (versionColumn.length === 0) {
      throw new Error('❌ schema_version column not found in theme_versions table')
    }
    console.log('✅ schema_version column exists in theme_versions\n')

    // Test 3: Get token contract
    console.log('Test 3: Testing contract registry...')
    const contract = getTokenContract('1.0.0')
    if (contract.schemaVersion !== '1.0.0') {
      throw new Error(`❌ Expected schema version 1.0.0, got ${contract.schemaVersion}`)
    }
    const latest = getLatestContractVersion()
    if (latest !== '1.0.0') {
      throw new Error(`❌ Expected latest version 1.0.0, got ${latest}`)
    }
    console.log('✅ Contract registry works correctly\n')

    // Test 4: Detect schema version
    console.log('Test 4: Testing schema version detection...')
    const detected = detectSchemaVersion(defaultThemeConfig)
    if (detected !== '1.0.0') {
      throw new Error(`❌ Expected detected version 1.0.0, got ${detected}`)
    }
    console.log('✅ Schema version detection works\n')

    // Test 5: Validate against contract
    console.log('Test 5: Testing contract validation...')
    const validationResult = validateAgainstContract(defaultThemeConfig, contract)
    if (!validationResult.valid) {
      throw new Error(`❌ Default config failed validation: ${validationResult.errors.map(e => e.message).join(', ')}`)
    }
    console.log('✅ Contract validation works\n')

    // Test 6: Check compatibility
    console.log('Test 6: Testing compatibility checking...')
    const compatibility = checkCompatibility(defaultThemeConfig, '1.0.0')
    if (!compatibility.compatible) {
      throw new Error(`❌ Default config not compatible: ${compatibility.issues.map(i => i.message).join(', ')}`)
    }
    console.log('✅ Compatibility checking works\n')

    // Test 7: Test migration (same version)
    console.log('Test 7: Testing migration (same version)...')
    const migrationResult = migrateThemeConfig(defaultThemeConfig, '1.0.0', '1.0.0')
    if (migrationResult.changes.length > 0) {
      throw new Error('❌ Migration should not make changes for same version')
    }
    console.log('✅ Migration works correctly\n')

    // Test 8: Test auto-migration
    console.log('Test 8: Testing auto-migration...')
    const autoMigrated = autoMigrateToLatest(defaultThemeConfig)
    if (!autoMigrated.migrated) {
      throw new Error('❌ Auto-migration failed')
    }
    console.log('✅ Auto-migration works\n')

    // Test 9: Test validateThemeConfigWithContract
    console.log('Test 9: Testing validateThemeConfigWithContract...')
    const validated = await validateThemeConfigWithContract(defaultThemeConfig, '1.0.0')
    if (!validated) {
      throw new Error('❌ validateThemeConfigWithContract failed')
    }
    console.log('✅ validateThemeConfigWithContract works\n')

    console.log('✅ All tests passed!')
  } catch (error: any) {
    console.error('\n❌ Test failed:')
    console.error(error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    await sql.end()
  }
}

testTokenContract()
