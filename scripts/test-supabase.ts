import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

async function testSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Faltan credenciales de Supabase')
    process.exit(1)
  }

  console.log('🔌 Probando conexión con Supabase...')
  console.log('URL:', supabaseUrl)
  console.log('Service Role Key:', serviceRoleKey.substring(0, 20) + '...')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ Error:', error.message)
      console.error('Code:', error.code)
      process.exit(1)
    }

    console.log('✅ Conexión exitosa!')
    console.log('✅ Puede acceder a la tabla events')
    console.log('✅ Service role key funciona correctamente')
  } catch (error: any) {
    console.error('❌ Error de conexión:', error.message)
    process.exit(1)
  }
}

testSupabase()

