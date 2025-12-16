import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url' || !supabaseUrl.startsWith('http')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurado. Agrega tu URL de Supabase en el archivo .env')
  }

  if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurado. Agrega tu anon key en el archivo .env')
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}

