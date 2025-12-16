# Configuración del archivo .env

## Opción 1: Usar el script automático (Recomendado)

Ejecuta el siguiente comando para crear el archivo `.env` automáticamente:

```bash
npm run setup:env
```

El script generará automáticamente las claves de seguridad (JWT_SECRET y ENCRYPTION_KEY).

## Opción 2: Crear manualmente

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Auth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Payment Providers
YAPPY_API_KEY=your_yappy_api_key
YAPPY_MERCHANT_ID=your_yappy_merchant_id
PAGUELOFACIL_API_KEY=your_paguelofacil_api_key
PAGUELOFACIL_SECRET=your_paguelofacil_secret

# Email
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY=your_aws_access_key
AWS_SES_SECRET_KEY=your_aws_secret_key

# Security (Genera claves aleatorias de al menos 32 caracteres)
JWT_SECRET=generate_a_random_secret_key_here_min_32_characters
ENCRYPTION_KEY=generate_another_random_key_here_32_characters
RATE_LIMIT_REDIS_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_SUBDOMAIN=admin
```

## Cómo obtener las credenciales

### Supabase
1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. En Settings > API encontrarás:
   - `NEXT_PUBLIC_SUPABASE_URL`: Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: service_role key (mantén esto secreto)
3. En Settings > Database encontrarás la connection string para `SUPABASE_DB_URL`

### Google OAuth
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un proyecto OAuth 2.0
3. Obtén el Client ID y Client Secret

### Payment Providers
- **Yappy**: Contacta a Yappy para obtener API credentials
- **PagueloFacil**: Contacta a PagueloFacil para obtener API credentials

### Email (Resend)
1. Ve a [resend.com](https://resend.com)
2. Crea una cuenta y obtén tu API key

### Security Keys
Para generar claves seguras, puedes usar:
```bash
# JWT_SECRET
openssl rand -hex 32

# ENCRYPTION_KEY
openssl rand -hex 32
```

O usa el script `npm run setup:env` que las genera automáticamente.

## Importante

- **NUNCA** subas el archivo `.env` al repositorio (ya está en `.gitignore`)
- Cambia todas las claves de seguridad en producción
- Usa diferentes credenciales para desarrollo y producción

