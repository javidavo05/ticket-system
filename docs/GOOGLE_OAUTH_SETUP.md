# Configuración de Google OAuth en Supabase

## Error: "Unsupported provider: provider is not enabled"

Este error indica que Google OAuth no está habilitado en tu proyecto de Supabase. Sigue estos pasos para habilitarlo:

## Paso 1: Configurar Google OAuth en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto o crea uno nuevo
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en **Create Credentials** → **OAuth client ID**
5. Si es la primera vez, configura la pantalla de consentimiento de OAuth:
   - Tipo de aplicación: **External** (o Internal si usas Google Workspace)
   - Completa la información requerida
6. Crea el OAuth client ID:
   - **Application type**: Web application
   - **Name**: Tu aplicación (ej: "Ticket System")
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (para desarrollo)
     - `https://ticket-system-sigma-nine.vercel.app` (tu URL de producción)
   - **Authorized redirect URIs**:
     - `https://ijfexclrwxrnfbemdtox.supabase.co/auth/v1/callback`
     - ⚠️ **IMPORTANTE**: Esta es la URL exacta que debes usar (basada en tu Project URL de Supabase)
     - Si tu Project URL es diferente, reemplaza `ijfexclrwxrnfbemdtox` con tu Project Reference
7. Copia el **Client ID** y **Client Secret** que se generan

## Paso 2: Habilitar Google en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **Providers**
3. Busca **Google** en la lista de proveedores
4. Haz clic en el toggle para **habilitar** Google
5. Ingresa las credenciales:
   - **Client ID (for OAuth)**: Pega el Client ID de Google Cloud Console
   - **Client Secret (for OAuth)**: Pega el Client Secret de Google Cloud Console
6. Haz clic en **Save**

## Paso 3: Verificar la configuración

Después de guardar, deberías ver:
- ✅ Google provider habilitado (toggle en verde)
- ✅ Client ID configurado
- ✅ Client Secret configurado (oculto por seguridad)

## Paso 4: Probar el login

1. Ve a tu aplicación y haz clic en "Continuar con Google"
2. Deberías ser redirigido a la página de autenticación de Google
3. Después de autenticarte, serás redirigido de vuelta a tu aplicación

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Verifica que la URL de redirect en Google Cloud Console coincida exactamente con:
  `https://ijfexclrwxrnfbemdtox.supabase.co/auth/v1/callback`
- Asegúrate de que no haya espacios o caracteres extra
- La URI debe ser exactamente: `https://[TU-PROJECT-REF].supabase.co/auth/v1/callback` (reemplaza con tu Project Reference)

### Error: "Invalid client"
- Verifica que el Client ID y Client Secret estén correctos en Supabase
- Asegúrate de haber copiado las credenciales completas sin espacios

### Error: "Access blocked"
- Verifica que la pantalla de consentimiento de OAuth esté configurada
- Si es la primera vez, puede tomar unos minutos en activarse

## URLs importantes

- **Supabase Dashboard**: https://app.supabase.com
- **Google Cloud Console**: https://console.cloud.google.com
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/social-login/auth-google

## Notas

- Las credenciales de Google OAuth son diferentes de las variables de entorno `NEXT_PUBLIC_GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` que se mencionan en `ENV_SETUP.md`
- Supabase maneja la autenticación OAuth directamente, por lo que no necesitas configurar esas variables de entorno para el SSO
- Las variables de entorno de Google solo serían necesarias si implementaras OAuth manualmente sin usar Supabase Auth

