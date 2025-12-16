# Configuración de Supabase

## ⚠️ Error: Invalid supabaseUrl

Si ves el error "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL", significa que faltan las credenciales de Supabase en tu archivo `.env`.

## 📝 Cómo obtener las credenciales

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Settings** → **API**
3. Encontrarás:
   - **Project URL**: Esta es tu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key**: Esta es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: Esta es tu `SUPABASE_SERVICE_ROLE_KEY` (mantén esto secreto)

## 🔧 Actualizar el archivo .env

Abre el archivo `.env` y actualiza estas líneas:

```env
# Supabase - Reemplaza con tus valores reales
NEXT_PUBLIC_SUPABASE_URL=https://ijfexclrwxrnfbemdtox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**Nota**: El Project URL generalmente tiene el formato:
`https://[tu-proyecto-ref].supabase.co`

## ✅ Verificación

Después de actualizar el `.env`, reinicia el servidor de desarrollo:

```bash
# Detén el servidor (Ctrl+C) y vuelve a iniciarlo
npm run dev
```

El error debería desaparecer una vez que las credenciales estén configuradas correctamente.

