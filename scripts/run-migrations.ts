import { readFileSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

async function runMigrations() {
  // Load environment variables
  let directUrl = process.env.DIRECT_URL || process.env.SUPABASE_DB_URL
  
  if (!directUrl) {
    throw new Error('DIRECT_URL or SUPABASE_DB_URL not found in environment')
  }

  // Decode URL-encoded password and remove quotes if present
  directUrl = directUrl.replace(/^["']|["']$/g, '')
  directUrl = decodeURIComponent(directUrl)
  
  // Remove brackets from password if present
  directUrl = directUrl.replace(/\[([^\]]+)\]/g, '$1')

  console.log('🔌 Connecting to database...')
  const sql = postgres(directUrl, {
    max: 1,
    ssl: 'require',
  })

  try {
    // Read and execute first migration
    console.log('\n📄 Running migration 001_initial_schema.sql...')
    const migration1 = readFileSync(
      join(__dirname, '../lib/db/migrations/001_initial_schema.sql'),
      'utf-8'
    )
    
    // Remove comments and split into statements
    const lines = migration1.split('\n')
    const cleanLines: string[] = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      // Skip comment lines and empty lines
      if (trimmed && !trimmed.startsWith('--')) {
        cleanLines.push(line)
      }
    }
    
    // Join and split by semicolons that are not inside strings or function bodies
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
      const nextChar = fullText[i + 1]
      
      // Check for dollar-quoted strings ($$...$$ or $tag$...$tag$)
      if (!inString && !inDollarQuote && char === '$') {
        // Look ahead to find the closing $
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

    // Read and execute second migration
    console.log('\n📄 Running migration 002_rls_policies.sql...')
    const migration2 = readFileSync(
      join(__dirname, '../lib/db/migrations/002_rls_policies.sql'),
      'utf-8'
    )
    
    // Use same parsing logic
    const lines2 = migration2.split('\n')
    const cleanLines2: string[] = []
    
    for (const line of lines2) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('--')) {
        cleanLines2.push(line)
      }
    }
    
    const fullText2 = cleanLines2.join('\n')
    const statements2: string[] = []
    let currentStatement2 = ''
    let depth2 = 0
    let inString2 = false
    let stringChar2 = ''
    let inDollarQuote2 = false
    let dollarTag2 = ''
    
    for (let i = 0; i < fullText2.length; i++) {
      const char = fullText2[i]
      
      // Check for dollar-quoted strings
      if (!inString2 && !inDollarQuote2 && char === '$') {
        let tagEnd = i + 1
        while (tagEnd < fullText2.length && fullText2[tagEnd] !== '$') {
          tagEnd++
        }
        if (tagEnd < fullText2.length) {
          dollarTag2 = fullText2.substring(i, tagEnd + 1)
          inDollarQuote2 = true
          currentStatement2 += dollarTag2
          i = tagEnd
          continue
        }
      } else if (inDollarQuote2 && fullText2.substring(i, i + dollarTag2.length) === dollarTag2) {
        inDollarQuote2 = false
        currentStatement2 += dollarTag2
        i += dollarTag2.length - 1
        dollarTag2 = ''
        continue
      }
      
      if (inDollarQuote2) {
        currentStatement2 += char
        continue
      }
      
      if (!inString2 && (char === '"' || char === "'")) {
        inString2 = true
        stringChar2 = char
        currentStatement2 += char
      } else if (inString2 && char === stringChar2 && fullText2[i - 1] !== '\\') {
        inString2 = false
        currentStatement2 += char
      } else if (!inString2 && char === '(') {
        depth2++
        currentStatement2 += char
      } else if (!inString2 && char === ')') {
        depth2--
        currentStatement2 += char
      } else if (!inString2 && char === ';' && depth2 === 0) {
        const stmt = currentStatement2.trim()
        if (stmt) {
          statements2.push(stmt)
        }
        currentStatement2 = ''
      } else {
        currentStatement2 += char
      }
    }
    
    if (currentStatement2.trim()) {
      statements2.push(currentStatement2.trim())
    }

    for (let i = 0; i < statements2.length; i++) {
      const statement = statements2[i]
      if (statement) {
        try {
          await sql.unsafe(statement)
          console.log(`✅ Statement ${i + 1}/${statements2.length} executed`)
        } catch (error: any) {
          if (error.message?.includes('already exists') || 
              error.message?.includes('duplicate key') ||
              error.code === '42P07' ||
              error.code === '42710') {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists)`)
          } else {
            console.error(`❌ Error in statement ${i + 1}:`)
            console.error(`   ${statement.substring(0, 100)}...`)
            console.error(`   Error: ${error.message}`)
            throw error
          }
        }
      }
    }

    console.log('\n✅ All migrations completed successfully!')
  } catch (error: any) {
    console.error('\n❌ Migration failed:')
    console.error(error.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigrations()

