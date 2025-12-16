import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('🔵 [SUPABASE CLIENT] Creando cliente...', {
    hasUrl: !!supabaseUrl,
    urlLength: supabaseUrl?.length,
    hasKey: !!supabaseAnonKey,
    keyLength: supabaseAnonKey?.length,
  })

  if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url' || !supabaseUrl.startsWith('http')) {
    console.error('❌ [SUPABASE CLIENT] URL inválida:', supabaseUrl)
    throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurado. Agrega tu URL de Supabase en el archivo .env')
  }

  if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') {
    console.error('❌ [SUPABASE CLIENT] Anon key inválida')
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurado. Agrega tu anon key en el archivo .env')
  }

  console.log('✅ [SUPABASE CLIENT] Cliente creado correctamente')
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}

