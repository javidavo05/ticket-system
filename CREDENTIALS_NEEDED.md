# Credenciales Pendientes

## ✅ Configurado

- ✅ `NEXT_PUBLIC_SUPABASE_URL` = https://ijfexclrwxrnfbemdtox.supabase.co
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Configurado
- ✅ `BREVO_API_KEY` = Configurado
- ✅ `DATABASE_URL` = Configurado con contraseña
- ✅ `DIRECT_URL` = Configurado con contraseña

## ⚠️ Pendiente

### SUPABASE_SERVICE_ROLE_KEY

Necesitas obtener el **service_role key** de Supabase:

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Settings** → **API**
3. Busca la sección **Project API keys**
4. Copia el **service_role** key (⚠️ NO el anon/public key)
5. Agrega al `.env`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
   ```

**Importante**: El service_role key tiene permisos completos. Manténlo secreto y nunca lo subas a GitHub.

### Otras credenciales opcionales

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Para Google OAuth (opcional)
- `GOOGLE_CLIENT_SECRET` - Para Google OAuth (opcional)
- `YAPPY_API_KEY` - Para pagos con Yappy (cuando lo configures)
- `PAGUELOFACIL_API_KEY` - Para pagos con PagueloFacil (cuando lo configures)

## 🚀 Una vez configurado

Después de agregar el `SUPABASE_SERVICE_ROLE_KEY`, reinicia el servidor:

```bash
npm run dev
```

La aplicación debería funcionar correctamente.

