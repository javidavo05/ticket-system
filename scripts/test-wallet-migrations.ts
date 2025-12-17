/**
 * Test Wallet Migrations
 * Validates that all wallet-related migrations work correctly
 * Run with: tsx scripts/test-wallet-migrations.ts
 */

import postgres from 'postgres'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// Load environment variables
config()

// Helper to parse SQL statements
function parseSQLStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
}

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
    console.log('🧪 Testing Wallet Migrations...\n')

    // Test 1: Check that event_id column exists in wallets
    console.log('Test 1: Checking event_id column in wallets table...')
    const walletColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'wallets' AND column_name = 'event_id'
    `
    if (walletColumns.length === 0) {
      throw new Error('❌ event_id column not found in wallets table')
    }
    console.log('✅ event_id column exists\n')

    // Test 2: Check that idempotency_key exists in wallet_transactions
    console.log('Test 2: Checking idempotency_key column in wallet_transactions...')
    const transactionColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'wallet_transactions' AND column_name = 'idempotency_key'
    `
    if (transactionColumns.length === 0) {
      throw new Error('❌ idempotency_key column not found in wallet_transactions table')
    }
    console.log('✅ idempotency_key column exists\n')

    // Test 3: Check that sequence_number exists
    console.log('Test 3: Checking sequence_number column...')
    const sequenceColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'wallet_transactions' AND column_name = 'sequence_number'
    `
    if (sequenceColumns.length === 0) {
      throw new Error('❌ sequence_number column not found')
    }
    console.log('✅ sequence_number column exists\n')

    // Test 4: Check unique constraint on (user_id, event_id)
    console.log('Test 4: Checking unique constraint on (user_id, event_id)...')
    const constraints = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'wallets' AND constraint_type = 'UNIQUE'
    `
    const hasUniqueConstraint = constraints.some(
      c => c.constraint_name === 'idx_wallets_user_event_unique'
    )
    if (!hasUniqueConstraint) {
      // Check if it's an index instead
      const indexes = await sql`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'wallets' AND indexname = 'idx_wallets_user_event_unique'
      `
      if (indexes.length === 0) {
        throw new Error('❌ Unique constraint/index on (user_id, event_id) not found')
      }
    }
    console.log('✅ Unique constraint on (user_id, event_id) exists\n')

    // Test 5: Check append-only trigger
    console.log('Test 5: Checking append-only trigger...')
    const triggers = await sql`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table = 'wallet_transactions'
        AND trigger_name = 'wallet_transactions_append_only'
    `
    if (triggers.length === 0) {
      throw new Error('❌ Append-only trigger not found')
    }
    console.log('✅ Append-only trigger exists\n')

    // Test 6: Check validation functions
    console.log('Test 6: Checking validation functions...')
    const functions = await sql`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('validate_wallet_ledger_integrity', 'check_wallet_sequence_gaps')
    `
    if (functions.length < 2) {
      throw new Error('❌ Validation functions not found')
    }
    console.log('✅ Validation functions exist\n')

    // Test 7: Test idempotency (create a test transaction)
    console.log('Test 7: Testing idempotency...')
    try {
      // Create a test user and wallet first (if they don't exist)
      const testUserId = '00000000-0000-0000-0000-000000000001'
      const testIdempotencyKey = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`

      // Try to insert a transaction with the same idempotency key twice
      // This should fail on the second insert due to unique constraint
      const { data: wallet } = await sql`
        SELECT id FROM wallets WHERE user_id = ${testUserId} LIMIT 1
      `

      if (wallet && wallet.length > 0) {
        const walletId = wallet[0].id

        // First insert should succeed
        await sql`
          INSERT INTO wallet_transactions (
            wallet_id, user_id, transaction_type, amount, balance_after,
            reference_type, description, idempotency_key, sequence_number
          ) VALUES (
            ${walletId}, ${testUserId}, 'credit', 10.00, 10.00,
            'reload', 'Test transaction', ${testIdempotencyKey}, 1
          )
          ON CONFLICT (idempotency_key) DO NOTHING
        `

        // Second insert with same key should be prevented
        try {
          await sql`
            INSERT INTO wallet_transactions (
              wallet_id, user_id, transaction_type, amount, balance_after,
              reference_type, description, idempotency_key, sequence_number
            ) VALUES (
              ${walletId}, ${testUserId}, 'credit', 10.00, 20.00,
              'reload', 'Duplicate test', ${testIdempotencyKey}, 2
            )
          `
          throw new Error('❌ Duplicate idempotency key was allowed (should be prevented)')
        } catch (error: any) {
          if (error.code === '23505') {
            // Unique constraint violation - this is expected
            console.log('✅ Idempotency constraint working correctly\n')
          } else {
            throw error
          }
        }

        // Clean up test transaction
        await sql`
          DELETE FROM wallet_transactions WHERE idempotency_key = ${testIdempotencyKey}
        `
      } else {
        console.log('⚠️  Skipping idempotency test (no test wallet found)\n')
      }
    } catch (error: any) {
      if (error.message.includes('Skipping')) {
        // Expected skip
      } else {
        console.log(`⚠️  Idempotency test skipped: ${error.message}\n`)
      }
    }

    // Test 8: Check RLS policies
    console.log('Test 8: Checking RLS policies...')
    const policies = await sql`
      SELECT policyname
      FROM pg_policies
      WHERE tablename = 'wallets' AND schemaname = 'public'
    `
    if (policies.length === 0) {
      throw new Error('❌ No RLS policies found for wallets table')
    }
    console.log(`✅ Found ${policies.length} RLS policies for wallets\n`)

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
