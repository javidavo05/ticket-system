import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DIRECT_URL || process.env.SUPABASE_DB_URL || '',
  },
} satisfies Config

