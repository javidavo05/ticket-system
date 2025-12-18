#!/usr/bin/env tsx
/**
 * Script para crear un usuario superadmin
 * 
 * Este script:
 * 1. Crea un usuario en Supabase Auth
 * 2. Crea un registro en la tabla users
 * 3. Asigna el rol super_admin en user_roles
 * 
 * Uso: npm run create:superadmin
 */

import { config } from 'dotenv'
import { createServiceRoleClient } from '../lib/supabase/server'
import { ROLES } from '../lib/utils/constants'
import crypto from 'crypto'

// Cargar variables de entorno
config()

/**
 * Genera una contraseña aleatoria segura
 */
function generatePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const randomBytes = crypto.randomBytes(length)
  let password = ''
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length]
  }
  
  return password
}

/**
 * Genera un email de admin
 */
function generateAdminEmail(): string {
  const randomId = crypto.randomBytes(4).toString('hex')
  return `admin-${randomId}@tickets.local`
}

async function createSuperAdmin() {
  console.log('🚀 Iniciando creación de superadmin...\n')

  try {
    // Obtener email y contraseña
    const email = process.env.ADMIN_EMAIL || generateAdminEmail()
    const password = process.env.ADMIN_PASSWORD || generatePassword(16)

    console.log('📧 Email:', email)
    console.log('🔑 Contraseña generada automáticamente\n')

    // Crear cliente con service role (permisos completos)
    const supabase = await createServiceRoleClient()

    // Paso 1: Crear usuario en Supabase Auth
    console.log('1️⃣ Creando usuario en Supabase Auth...')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.error('❌ Error: El email ya está registrado')
        console.error('   Si quieres crear otro usuario, usa un email diferente o elimina el usuario existente')
        process.exit(1)
      }
      throw authError
    }

    if (!authUser.user) {
      throw new Error('No se pudo crear el usuario en Auth')
    }

    const userId = authUser.user.id
    console.log('✅ Usuario creado en Auth (ID:', userId, ')\n')

    // Paso 2: Crear registro en tabla users
    console.log('2️⃣ Creando registro en tabla users...')
    const { error: userError } = await ((supabase as any)
      .from('users')
      .insert({
        id: userId,
        email: email,
        full_name: 'Super Admin',
        wallet_balance: '0',
      }))

    if (userError) {
      // Si el error es que ya existe, continuar
      if (userError.code === '23505') { // Unique violation
        console.log('⚠️  El usuario ya existe en la tabla users, continuando...\n')
      } else {
        throw userError
      }
    } else {
      console.log('✅ Registro creado en tabla users\n')
    }

    // Paso 3: Asignar rol super_admin
    console.log('3️⃣ Asignando rol super_admin...')
    
    // Verificar si ya tiene el rol
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', ROLES.SUPER_ADMIN)
      .is('event_id', null)
      .single()

    if (existingRole) {
      console.log('⚠️  El usuario ya tiene el rol super_admin\n')
    } else {
      const { error: roleError } = await ((supabase as any)
        .from('user_roles')
        .insert({
          user_id: userId,
          role: ROLES.SUPER_ADMIN,
          event_id: null, // Rol global, no específico de evento
        }))

      if (roleError) {
        throw roleError
      }

      console.log('✅ Rol super_admin asignado\n')
    }

    // Mostrar credenciales
    console.log('='.repeat(60))
    console.log('✅ Superadmin creado exitosamente!\n')
    console.log('📋 Credenciales:')
    console.log('   Email:', email)
    console.log('   Contraseña:', password)
    console.log('\n🔗 Acceso al panel:')
    console.log('   http://localhost:3000/admin/dashboard')
    console.log('   o')
    console.log('   http://localhost:3000/login')
    console.log('='.repeat(60))
    console.log('\n⚠️  IMPORTANTE: Guarda estas credenciales de forma segura')
    console.log('   En producción, cambia la contraseña después del primer login\n')

  } catch (error: any) {
    console.error('❌ Error al crear superadmin:', error.message)
    if (error.details) {
      console.error('   Detalles:', error.details)
    }
    process.exit(1)
  }
}

// Ejecutar script
createSuperAdmin()

