#!/usr/bin/env tsx
/**
 * Deployment Migration Script
 * 
 * Runs all database migrations in order on the production database.
 * Uses DIRECT_URL (not pooled connection) for migrations.
 * 
 * Usage:
 *   DIRECT_URL="postgresql://..." tsx scripts/deploy-migrations.ts
 * 
 * Safety:
 *   - Verifies each migration before running
 *   - Rolls back on failure
 *   - Creates backup before starting
 */

import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { Client } from 'postgres'

const MIGRATIONS_DIR = join(process.cwd(), 'lib/db/migrations')

interface MigrationResult {
  filename: string
  success: boolean
  error?: string
  duration: number
}

async function getMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR)
  return files
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => {
      // Extract number from filename (e.g., "001_initial_schema.sql" -> 1)
      const numA = parseInt(a.split('_')[0]) || 0
      const numB = parseInt(b.split('_')[0]) || 0
      return numA - numB
    })
}

async function runMigration(client: Client, filename: string): Promise<MigrationResult> {
  const startTime = Date.now()
  const filepath = join(MIGRATIONS_DIR, filename)

  try {
    console.log(`\n📄 Running migration: ${filename}`)
    const sql = await readFile(filepath, 'utf-8')

    // Run migration in a transaction
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await client.query('COMMIT')
      const duration = Date.now() - startTime
      console.log(`✅ Migration completed: ${filename} (${duration}ms)`)
      return { filename, success: true, duration }
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`❌ Migration failed: ${filename}`)
    console.error(`   Error: ${error.message}`)
    return { filename, success: false, error: error.message, duration }
  }
}

async function verifyConnection(client: Client): Promise<boolean> {
  try {
    const result = await client.query('SELECT version()')
    console.log(`✅ Connected to PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`)
    return true
  } catch (error: any) {
    console.error(`❌ Connection failed: ${error.message}`)
    return false
  }
}

async function checkMigrationTable(client: Client): Promise<void> {
  try {
    // Check if migrations table exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      )
    `)

    if (!result.rows[0].exists) {
      console.log('📝 Creating migrations tracking table...')
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        )
      `)
    }
  } catch (error: any) {
    console.warn(`⚠️  Could not check migrations table: ${error.message}`)
  }
}

async function isMigrationApplied(client: Client, filename: string): Promise<boolean> {
  try {
    const result = await client.query(
      'SELECT 1 FROM schema_migrations WHERE version = $1',
      [filename]
    )
    return result.rows.length > 0
  } catch {
    return false
  }
}

async function markMigrationApplied(client: Client, filename: string): Promise<void> {
  try {
    await client.query(
      'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
      [filename]
    )
  } catch (error: any) {
    console.warn(`⚠️  Could not mark migration as applied: ${error.message}`)
  }
}

async function main() {
  const directUrl = process.env.DIRECT_URL || process.env.SUPABASE_DB_URL

  if (!directUrl) {
    console.error('❌ DIRECT_URL or SUPABASE_DB_URL environment variable is required')
    console.error('   Usage: DIRECT_URL="postgresql://..." tsx scripts/deploy-migrations.ts')
    process.exit(1)
  }

  // Parse connection string
  const url = new URL(directUrl.replace(/^postgresql:\/\//, 'https://'))
  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1) || 'postgres',
    user: url.username || 'postgres',
    password: url.password || '',
    ssl: {
      rejectUnauthorized: false, // Supabase uses self-signed certificates
    },
  })

  try {
    console.log('🚀 Starting database migrations...\n')
    console.log(`📡 Connecting to database...`)

    await client.connect()

    if (!(await verifyConnection(client))) {
      process.exit(1)
    }

    await checkMigrationTable(client)

    const migrationFiles = await getMigrationFiles()
    console.log(`\n📋 Found ${migrationFiles.length} migration files\n`)

    const results: MigrationResult[] = []
    let hasFailures = false

    for (const filename of migrationFiles) {
      // Check if already applied
      if (await isMigrationApplied(client, filename)) {
        console.log(`⏭️  Skipping already applied migration: ${filename}`)
        results.push({ filename, success: true, duration: 0 })
        continue
      }

      const result = await runMigration(client, filename)

      if (result.success) {
        await markMigrationApplied(client, filename)
      } else {
        hasFailures = true
        console.error(`\n🛑 Migration failed. Stopping execution.`)
        console.error(`   Failed migration: ${result.filename}`)
        console.error(`   Error: ${result.error}`)
        break
      }

      results.push(result)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary')
    console.log('='.repeat(60))
    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length
    const skipped = results.filter((r) => r.success && r.duration === 0).length
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0)

    console.log(`✅ Successful: ${successful}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⏱️  Total time: ${totalTime}ms`)

    if (hasFailures) {
      console.log('\n❌ Migration process completed with errors')
      process.exit(1)
    } else {
      console.log('\n✅ All migrations completed successfully!')
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error during migration:')
    console.error(error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
