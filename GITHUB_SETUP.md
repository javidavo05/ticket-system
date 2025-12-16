# Configuración de GitHub y Credenciales

## ✅ Configuración Completada

1. ✅ Repositorio Git inicializado
2. ✅ Remote de GitHub configurado: `https://github.com/javidavo05/ticket-system.git`
3. ✅ Commit inicial creado
4. ✅ Brevo configurado como proveedor de email por defecto
5. ✅ Configuración de Supabase actualizada con connection pooling

## 📝 Próximos Pasos

### 1. Actualizar el archivo .env

Abre el archivo `.env` y actualiza las siguientes variables con tus credenciales:

```env
# Supabase - Reemplaza [YOUR-PASSWORD] con tu contraseña real
DATABASE_URL="postgresql://postgres.ijfexclrwxrnfbemdtox:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.ijfexclrwxrnfbemdtox:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
SUPABASE_DB_URL="postgresql://postgres.ijfexclrwxrnfbemdtox:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# También necesitas obtener de tu dashboard de Supabase:
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Email - Brevo (agrega tu API key)
EMAIL_PROVIDER=brevo
BREVO_API_KEY=your_brevo_api_key
```

### 2. Subir el código a GitHub

```bash
# Verificar que el remote está configurado
git remote -v

# Hacer push al repositorio
git push -u origin main
```

Si es la primera vez que haces push, GitHub puede pedirte autenticación. Usa un Personal Access Token si es necesario.

### 3. Configurar variables de entorno en producción

Cuando despliegues en Vercel o otro servicio:

1. Ve a la configuración del proyecto
2. Agrega todas las variables del archivo `.env` como variables de entorno
3. **IMPORTANTE**: No subas el archivo `.env` al repositorio (ya está en `.gitignore`)

### 4. Ejecutar migraciones de base de datos

Una vez que tengas la contraseña de Supabase configurada:

```bash
# Usar DIRECT_URL para migraciones
psql "$DIRECT_URL" -f lib/db/migrations/001_initial_schema.sql
psql "$DIRECT_URL" -f lib/db/migrations/002_rls_policies.sql
```

O desde el dashboard de Supabase:
1. Ve a SQL Editor
2. Copia y pega el contenido de `lib/db/migrations/001_initial_schema.sql`
3. Ejecuta
4. Repite con `lib/db/migrations/002_rls_policies.sql`

## 🔐 Seguridad

- ✅ El archivo `.env` está en `.gitignore` y no se subirá al repositorio
- ✅ Las claves de seguridad (JWT_SECRET, ENCRYPTION_KEY) fueron generadas automáticamente
- ⚠️ **NUNCA** subas credenciales al repositorio
- ⚠️ Usa diferentes credenciales para desarrollo y producción

## 📧 Configuración de Brevo

Brevo está configurado como proveedor de email por defecto. Agrega tu API key en el archivo `.env`.

Para verificar que funciona:
1. Asegúrate de que `EMAIL_PROVIDER=brevo` en tu `.env`
2. Agrega tu `BREVO_API_KEY` en el `.env`
3. El sistema enviará emails automáticamente cuando se completen compras de tickets

## 🚀 Listo para Desplegar

Una vez completados estos pasos, el sistema estará listo para:
- Desarrollo local: `npm run dev`
- Despliegue en Vercel: Conecta el repositorio de GitHub
- Producción: Configura las variables de entorno en tu plataforma de hosting
