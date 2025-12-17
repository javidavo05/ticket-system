import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isSuperAdmin, hasRole } from '@/lib/supabase/rls'
import { ROLES } from '@/lib/utils/constants'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  let next = requestUrl.searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      // Sincronizar usuario con tabla users si no existe
      // Solo crear perfil si NO es super admin
      try {
        const serviceClient = await createServiceRoleClient()
        const isSuper = await isSuperAdmin(data.user.id)
        
        // Super admins no necesitan perfil en tabla users (no tienen tickets)
        if (!isSuper) {
          const { data: existingUser } = await serviceClient
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single()

          if (!existingUser) {
            // Crear registro en tabla users solo si no es super admin
            await (serviceClient.from('users') as any).insert({
              id: data.user.id,
              email: data.user.email || '',
              full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
              profile_photo_url: data.user.user_metadata?.avatar_url || null,
            })
          } else {
            // Actualizar datos si el usuario ya existe
            await (serviceClient.from('users') as any)
              .update({
                email: data.user.email || '',
                full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
                profile_photo_url: data.user.user_metadata?.avatar_url || null,
              })
              .eq('id', data.user.id)
          }
        }

        // Determinar redirección según rol si no hay 'next' especificado
        if (!next) {
          if (isSuper) {
            next = '/super'
          } else {
            // Verificar otros roles de admin
            const isEventAdmin = await hasRole(data.user.id, ROLES.EVENT_ADMIN)
            const isAccounting = await hasRole(data.user.id, ROLES.ACCOUNTING)
            const isScanner = await hasRole(data.user.id, ROLES.SCANNER)
            const isPromoter = await hasRole(data.user.id, ROLES.PROMOTER)
            
            if (isEventAdmin || isAccounting || isScanner || isPromoter) {
              next = '/admin/dashboard'
            } else {
              next = '/profile'
            }
          }
        }
      } catch (syncError) {
        console.error('Error syncing user to database:', syncError)
        // Continue even if sync fails - user is still authenticated
      }
    }

    if (error) {
      // Determinar a qué login redirigir según el error
      const loginPath = next?.startsWith('/super') ? '/super/login' : next?.startsWith('/admin') ? '/admin/login' : '/login'
      return NextResponse.redirect(new URL(`${loginPath}?error=${encodeURIComponent(error.message)}`, request.url))
    }

    return NextResponse.redirect(new URL(next || '/', request.url))
  }

  return NextResponse.redirect(new URL('/login?error=oauth_error', request.url))
}

