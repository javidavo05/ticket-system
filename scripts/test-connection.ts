import postgres from 'postgres'
import { config } from 'dotenv'

config()

async function testConnection() {
  let directUrl = process.env.DIRECT_URL || process.env.SUPABASE_DB_URL
  
  if (!directUrl) {
    throw new Error('DIRECT_URL not found')
  }

  // Remove quotes
  directUrl = directUrl.replace(/^["']|["']$/g, '')
  
  // Don't decode - postgres library handles URL encoding
  console.log('Testing connection with URL:', directUrl.replace(/:[^@]+@/, ':****@'))
  console.log('URL contains encoded password:', directUrl.includes('%40'))
  
  const sql = postgres(directUrl, {
    max: 1,
    ssl: 'require',
  })

  try {
    const result = await sql`SELECT version() as version, current_database() as db`
    console.log('✅ Connection successful!')
    console.log('Database:', result[0].db)
    console.log('PostgreSQL version:', result[0].version.substring(0, 50) + '...')
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message)
    console.error('Error code:', error.code)
    
    // Try with password manually encoded
    console.log('\n🔧 Trying alternative: manually encoding password...')
    const urlMatch = directUrl.match(/postgresql:\/\/([^:]+):([^@]+)@(.+)/)
    if (urlMatch) {
      const [, user, pass, rest] = urlMatch
      const encodedPass = encodeURIComponent(pass)
      const newUrl = `postgresql://${user}:${encodedPass}@${rest}`
      console.log('Trying URL with encoded password...')
      
      const sql2 = postgres(newUrl, { max: 1, ssl: 'require' })
      try {
        await sql2`SELECT 1`
        console.log('✅ Alternative connection successful!')
      } catch (e: any) {
        console.error('❌ Alternative also failed:', e.message)
      } finally {
        await sql2.end()
      }
    }
  } finally {
    await sql.end()
  }
}

testConnection()

