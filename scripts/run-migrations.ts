import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

// Helper function to parse SQL and split into statements
function parseSQLStatements(sql: string): string[] {
  const lines = sql.split('\n')
  const cleanLines: string[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    // Skip comment lines and empty lines
    if (trimmed && !trimmed.startsWith('--')) {
      cleanLines.push(line)
    }
  }
  
  const fullText = cleanLines.join('\n')
  const statements: string[] = []
  let currentStatement = ''
  let depth = 0
  let inString = false
  let stringChar = ''
  let inDollarQuote = false
  let dollarTag = ''
  
  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i]
    
    // Check for dollar-quoted strings ($$...$$ or $tag$...$tag$)
    if (!inString && !inDollarQuote && char === '$') {
      let tagEnd = i + 1
      while (tagEnd < fullText.length && fullText[tagEnd] !== '$') {
        tagEnd++
      }
      if (tagEnd < fullText.length) {
        dollarTag = fullText.substring(i, tagEnd + 1)
        inDollarQuote = true
        currentStatement += dollarTag
        i = tagEnd
        continue
      }
    } else if (inDollarQuote && fullText.substring(i, i + dollarTag.length) === dollarTag) {
      inDollarQuote = false
      currentStatement += dollarTag
      i += dollarTag.length - 1
      dollarTag = ''
      continue
    }
    
    if (inDollarQuote) {
      currentStatement += char
      continue
    }
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true
      stringChar = char
      currentStatement += char
    } else if (inString && char === stringChar && fullText[i - 1] !== '\\') {
      inString = false
      currentStatement += char
    } else if (!inString && char === '(') {
      depth++
      currentStatement += char
    } else if (!inString && char === ')') {
      depth--
      currentStatement += char
    } else if (!inString && char === ';' && depth === 0) {
      const stmt = currentStatement.trim()
      if (stmt) {
        statements.push(stmt)
      }
      currentStatement = ''
    } else {
      currentStatement += char
    }
  }
  
  // Add last statement if exists
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim())
  }
  
  return statements
}

// Helper function to execute SQL statements
async function executeStatements(sql: postgres.Sql, statements: string[], migrationName: string) {
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (statement) {
      try {
        await sql.unsafe(statement)
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`)
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message?.includes('already exists') || 
            error.message?.includes('duplicate key') ||
            error.message?.includes('duplicate') ||
            error.code === '42P07' || // duplicate_table
            error.code === '42710') { // duplicate_object
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`)
        } else {
          console.error(`❌ Error in statement ${i + 1}:`)
          console.error(`   ${statement.substring(0, 150)}...`)
          console.error(`   Error: ${error.message}`)
          throw error
        }
      }
    }
  }
}

async function runMigrations() {
  // Load environment variables
  let directUrl = process.env.DIRECT_URL || process.env.SUPABASE_DB_URL
  
  if (!directUrl) {
    throw new Error('DIRECT_URL or SUPABASE_DB_URL not found in environment')
  }

  // Remove quotes if present
  directUrl = directUrl.replace(/^["']|["']$/g, '')
  
  // Don't decode URL - postgres library handles URL-encoded passwords automatically
  // The password should be URL-encoded in the .env file (e.g., @ becomes %40)

  console.log('🔌 Connecting to database...')
  const sql = postgres(directUrl, {
    max: 1,
    ssl: 'require',
  })

  try {
    // Get all migration files in order
    const migrationsDir = join(__dirname, '../lib/db/migrations')
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort() // Sort alphabetically to ensure order
    
    console.log(`\n📋 Found ${files.length} migration files\n`)

    // Execute each migration
    for (const file of files) {
      console.log(`📄 Running migration ${file}...`)
      const migrationPath = join(migrationsDir, file)
      const migrationContent = readFileSync(migrationPath, 'utf-8')
      
      const statements = parseSQLStatements(migrationContent)
      await executeStatements(sql, statements, file)
      console.log(`✅ Migration ${file} completed\n`)
    }

    console.log('✅ All migrations completed successfully!')
  } catch (error: any) {
    console.error('\n❌ Migration failed:')
    console.error(error.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigrations()
