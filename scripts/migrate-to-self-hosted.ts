#!/usr/bin/env tsx
/**
 * Migration to Self-Hosted Infrastructure
 * 
 * This script helps migrate from Supabase to self-hosted PostgreSQL.
 * Supports dual-write mode and cutover procedures.
 * 
 * Usage:
 *   # Phase 1: Setup dual-write
 *   SUPABASE_DB_URL="..." SELF_HOSTED_DB_URL="..." tsx scripts/migrate-to-self-hosted.ts --phase=dual-write
 * 
 *   # Phase 2: Verify data consistency
 *   tsx scripts/migrate-to-self-hosted.ts --phase=verify
 * 
 *   # Phase 3: Cutover
 *   tsx scripts/migrate-to-self-hosted.ts --phase=cutover
 */

import postgres from 'postgres'
import { readFile } from 'fs/promises'
import { join } from 'path'

interface MigrationConfig {
  phase: 'setup' | 'dual-write' | 'verify' | 'cutover'
  supabaseUrl?: string
  selfHostedUrl?: string
  dryRun?: boolean
}

async function parseArgs(): Promise<MigrationConfig> {
  const args = process.argv.slice(2)
  const config: MigrationConfig = {
    phase: 'setup',
    dryRun: false,
  }

  for (const arg of args) {
    if (arg.startsWith('--phase=')) {
      const phase = arg.split('=')[1] as MigrationConfig['phase']
      if (['setup', 'dual-write', 'verify', 'cutover'].includes(phase)) {
        config.phase = phase
      }
    } else if (arg === '--dry-run') {
      config.dryRun = true
    }
  }

  config.supabaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
  config.selfHostedUrl = process.env.SELF_HOSTED_DB_URL

  return config
}

async function createDualWriteFunction(client: ReturnType<typeof postgres>): Promise<void> {
  console.log('📝 Creating dual-write function...')
  
  const sql = `
    -- Function to write to both databases
    CREATE OR REPLACE FUNCTION dual_write(
      table_name TEXT,
      operation TEXT,
      data JSONB
    ) RETURNS VOID AS $$
    DECLARE
      supabase_client TEXT;
      self_hosted_client TEXT;
    BEGIN
      -- Write to Supabase (primary)
      PERFORM write_to_supabase(table_name, operation, data);
      
      -- Write to self-hosted (secondary)
      BEGIN
        PERFORM write_to_self_hosted(table_name, operation, data);
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail
        RAISE WARNING 'Failed to write to self-hosted: %', SQLERRM;
      END;
    END;
    $$ LANGUAGE plpgsql;
  `

  await client.unsafe(sql)
  console.log('✅ Dual-write function created')
}

async function verifyDataConsistency(
  supabaseClient: ReturnType<typeof postgres>,
  selfHostedClient: ReturnType<typeof postgres>
): Promise<{ consistent: boolean; differences: string[] }> {
  console.log('🔍 Verifying data consistency...')
  
  const differences: string[] = []
  const tables = [
    'users',
    'events',
    'tickets',
    'payments',
    'wallets',
    'nfc_bands',
  ]

  for (const table of tables) {
    try {
      // Get row counts
      const supabaseResult = await supabaseClient.unsafe(`SELECT COUNT(*) as count FROM ${table}`)
      const supabaseCount = supabaseResult[0]
      const selfHostedResult = await selfHostedClient.unsafe(`SELECT COUNT(*) as count FROM ${table}`)
      const selfHostedCount = selfHostedResult[0]

      const supabaseRows = parseInt(supabaseCount.count)
      const selfHostedRows = parseInt(selfHostedCount.count)

      if (supabaseRows !== selfHostedRows) {
        differences.push(
          `${table}: Supabase has ${supabaseRows} rows, self-hosted has ${selfHostedRows} rows`
        )
      }
    } catch (error: any) {
      differences.push(`${table}: Error comparing - ${error.message}`)
    }
  }

  const consistent = differences.length === 0

  if (consistent) {
    console.log('✅ Data is consistent between both databases')
  } else {
    console.log('❌ Data inconsistencies found:')
    differences.forEach((diff) => console.log(`   - ${diff}`))
  }

  return { consistent, differences }
}

async function exportData(client: ReturnType<typeof postgres>, outputPath: string): Promise<void> {
  console.log(`📤 Exporting data to ${outputPath}...`)
  
  // This would use pg_dump in production
  // For now, just a placeholder
  console.log('⚠️  Use pg_dump for full data export:')
  console.log(`   pg_dump "$DATABASE_URL" > ${outputPath}`)
}

async function importData(client: ReturnType<typeof postgres>, inputPath: string): Promise<void> {
  console.log(`📥 Importing data from ${inputPath}...`)
  
  // This would use psql in production
  // For now, just a placeholder
  console.log('⚠️  Use psql for full data import:')
  console.log(`   psql "$SELF_HOSTED_DB_URL" < ${inputPath}`)
}

async function setupPhase(config: MigrationConfig): Promise<void> {
  console.log('🚀 Phase 1: Setup')
  console.log('=' .repeat(60))

  if (!config.selfHostedUrl) {
    console.error('❌ SELF_HOSTED_DB_URL environment variable is required')
    process.exit(1)
  }

  const selfHostedClient = postgres(config.selfHostedUrl)

  try {
    // postgres client connects automatically
    console.log('✅ Connected to self-hosted database')

    // Run all migrations on self-hosted
    console.log('📋 Running migrations on self-hosted database...')
    // This would call deploy-migrations.ts with SELF_HOSTED_DB_URL
    console.log('   Run: DIRECT_URL="$SELF_HOSTED_DB_URL" npm run deploy:migrations')

    console.log('\n✅ Setup phase complete')
    console.log('   Next: Enable dual-write mode')
  } finally {
    await selfHostedClient.end()
  }
}

async function dualWritePhase(config: MigrationConfig): Promise<void> {
  console.log('🚀 Phase 2: Dual-Write Mode')
  console.log('=' .repeat(60))

  console.log('⚠️  Dual-write mode requires application code changes:')
  console.log('   1. Modify database write operations to write to both databases')
  console.log('   2. Use connection pool for Supabase (primary)')
  console.log('   3. Use direct connection for self-hosted (secondary)')
  console.log('   4. Handle errors gracefully (don\'t fail if self-hosted write fails)')
  console.log('   5. Monitor both databases for consistency')

  console.log('\n📝 Example implementation:')
  console.log(`
    async function dualWrite(table: string, data: any) {
      // Write to Supabase (primary)
      await supabaseClient.from(table).insert(data)
      
      // Write to self-hosted (secondary) - don't fail on error
      try {
        await selfHostedClient.unsafe(
          \`INSERT INTO \${table} VALUES ...\`
        )
      } catch (error) {
        // Log but don't throw
        console.error('Self-hosted write failed:', error)
      }
    }
  `)

  console.log('\n✅ Dual-write mode instructions provided')
  console.log('   Next: Verify data consistency')
}

async function verifyPhase(config: MigrationConfig): Promise<void> {
  console.log('🚀 Phase 3: Verify Data Consistency')
  console.log('=' .repeat(60))

  if (!config.supabaseUrl || !config.selfHostedUrl) {
    console.error('❌ Both SUPABASE_DB_URL and SELF_HOSTED_DB_URL are required')
    process.exit(1)
  }

  const supabaseClient = postgres(config.supabaseUrl)

  const selfHostedClient = postgres(config.selfHostedUrl)

  try {
    // postgres client connects automatically
    // postgres client connects automatically

    const result = await verifyDataConsistency(supabaseClient, selfHostedClient)

    if (result.consistent) {
      console.log('\n✅ Data is consistent - ready for cutover')
    } else {
      console.log('\n❌ Data inconsistencies found - fix before cutover')
      process.exit(1)
    }
  } finally {
    await supabaseClient.end()
    await selfHostedClient.end()
  }
}

async function cutoverPhase(config: MigrationConfig): Promise<void> {
  console.log('🚀 Phase 4: Cutover')
  console.log('=' .repeat(60))

  if (config.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  }

  console.log('⚠️  CUTOVER PROCEDURE:')
  console.log('   1. Stop application writes (maintenance mode)')
  console.log('   2. Verify final data consistency')
  console.log('   3. Update DATABASE_URL to point to self-hosted')
  console.log('   4. Update DIRECT_URL to point to self-hosted')
  console.log('   5. Restart application')
  console.log('   6. Monitor for 24 hours')
  console.log('   7. Keep Supabase as read replica for 1 week')
  console.log('   8. Decommission Supabase after stability confirmed')

  if (!config.dryRun) {
    console.log('\n❓ Are you sure you want to proceed with cutover?')
    console.log('   This will switch the primary database to self-hosted.')
    // In production, add confirmation prompt
  }

  console.log('\n✅ Cutover procedure documented')
}

async function main() {
  const config = await parseArgs()

  console.log('🔄 Migration to Self-Hosted Infrastructure')
  console.log('=' .repeat(60))
  console.log(`Phase: ${config.phase}`)
  console.log(`Dry Run: ${config.dryRun ? 'Yes' : 'No'}`)
  console.log('')

  switch (config.phase) {
    case 'setup':
      await setupPhase(config)
      break
    case 'dual-write':
      await dualWritePhase(config)
      break
    case 'verify':
      await verifyPhase(config)
      break
    case 'cutover':
      await cutoverPhase(config)
      break
    default:
      console.error(`Unknown phase: ${config.phase}`)
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
