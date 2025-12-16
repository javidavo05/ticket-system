#!/usr/bin/env tsx
/**
 * Script para verificar usuarios y sus roles
 * 
 * Uso: npm run check:user <email>
 */

import { config } from 'dotenv'
import { createServiceRoleClient } from '../lib/supabase/server'

config()

async function checkUserRoles(email?: string) {
  const supabase = await createServiceRoleClient()

  if (email) {
    // Buscar usuario específico
    console.log(`🔍 Buscando usuario: ${email}\n`)
    
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', email)
      .limit(1)

    if (userError) {
      console.error('❌ Error al buscar usuario:', userError.message)
      process.exit(1)
    }

    if (!users || users.length === 0) {
      console.error('❌ Usuario no encontrado')
      process.exit(1)
    }

    const user = users[0]
    console.log('✅ Usuario encontrado:')
    console.log('   ID:', user.id)
    console.log('   Email:', user.email)
    console.log('   Nombre:', user.full_name || 'N/A')
    console.log('')

    // Verificar roles
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role, event_id, created_at')
      .eq('user_id', user.id)

    if (roleError) {
      console.error('❌ Error al buscar roles:', roleError.message)
      process.exit(1)
    }

    console.log('📋 Roles asignados:')
    if (!roles || roles.length === 0) {
      console.log('   ⚠️  No tiene roles asignados')
    } else {
      roles.forEach(role => {
        console.log(`   - ${role.role}${role.event_id ? ` (Evento: ${role.event_id})` : ' (Global)'}`)
      })
    }

    // Verificar en Supabase Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (!authError) {
      const authUser = authUsers.users.find(u => u.email === email)
      if (authUser) {
        console.log('\n✅ Usuario existe en Supabase Auth')
        console.log('   Email confirmado:', authUser.email_confirmed_at ? 'Sí' : 'No')
        console.log('   Último login:', authUser.last_sign_in_at || 'Nunca')
      } else {
        console.log('\n⚠️  Usuario no encontrado en Supabase Auth')
      }
    }

  } else {
    // Listar todos los usuarios con roles
    console.log('📋 Listando todos los usuarios con roles:\n')

    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id, role, event_id, users(email, full_name)')
      .order('created_at', { ascending: false })

    if (roleError) {
      console.error('❌ Error al buscar roles:', roleError.message)
      process.exit(1)
    }

    if (!roles || roles.length === 0) {
      console.log('⚠️  No hay usuarios con roles asignados')
      return
    }

    const usersMap = new Map<string, any[]>()
    roles.forEach(role => {
      const userId = role.user_id
      if (!usersMap.has(userId)) {
        usersMap.set(userId, [])
      }
      usersMap.get(userId)!.push({
        role: role.role,
        eventId: role.event_id,
        user: role.users,
      })
    })

    usersMap.forEach((userRoles, userId) => {
      const user = userRoles[0].user
      console.log(`\n👤 ${user.email} (${user.full_name || 'Sin nombre'})`)
      console.log('   ID:', userId)
      userRoles.forEach(r => {
        console.log(`   - ${r.role}${r.eventId ? ` (Evento: ${r.eventId})` : ' (Global)'}`)
      })
    })
  }
}

const email = process.argv[2]
checkUserRoles(email)

