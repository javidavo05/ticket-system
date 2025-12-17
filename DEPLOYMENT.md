# Deployment Guide

Complete guide for deploying the ticketing platform to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Vercel Deployment](#vercel-deployment)
3. [Domain Configuration](#domain-configuration)
4. [Database Setup](#database-setup)
5. [Environment Variables](#environment-variables)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring Setup](#monitoring-setup)
8. [Rollback Procedure](#rollback-procedure)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- GitHub repository: `https://github.com/javidavo05/ticket-system.git`
- Vercel account (Pro tier recommended for production)
- Supabase project (Pro tier recommended)
- Domain name with DNS access
- All environment variables ready (see `.env.example`)

## Vercel Deployment

### Step 1: Connect Repository

**Option A: Via Vercel Dashboard**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import Git Repository
4. Select `javidavo05/ticket-system`
5. Configure project settings

**Option B: Via Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel link
```

### Step 2: Configure Build Settings

Vercel should auto-detect Next.js, but verify:
- **Framework Preset:** Next.js
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install`
- **Node Version:** 18.x or higher

### Step 3: Add Environment Variables

Go to Project Settings → Environment Variables and add all variables from `.env.example`:

**Required for Production:**
- All Supabase variables
- All security variables (JWT_SECRET, ENCRYPTION_KEY)
- NEXT_PUBLIC_APP_URL (production domain)
- Payment provider credentials
- Email provider credentials

**Mark as Encrypted:**
- SUPABASE_SERVICE_ROLE_KEY
- GOOGLE_CLIENT_SECRET
- JWT_SECRET
- ENCRYPTION_KEY
- All payment provider secrets
- All email provider secrets

**Environment Scope:**
- Production: All variables
- Preview: Staging/test values
- Development: Development values

### Step 4: Deploy

1. Push code to `main` branch
2. Vercel will automatically deploy
3. Monitor build logs in Vercel dashboard
4. Verify deployment succeeds

## Domain Configuration

### Main Domain Setup

1. Go to Project Settings → Domains
2. Add custom domain: `sistemadeventa.com`
3. Follow DNS configuration instructions

**DNS Records:**
```
Type: A
Name: @
Value: [Vercel IP from dashboard]
TTL: Auto
```

### Subdomain Configuration

**Admin Subdomain:**
```
Type: CNAME
Name: admin
Value: cname.vercel-dns.com
TTL: Auto
```

**Super Admin Subdomain:**
```
Type: CNAME
Name: super
Value: cname.vercel-dns.com
TTL: Auto
```

**SSL Certificates:**
- Vercel automatically provisions SSL certificates
- Wait 24-48 hours for DNS propagation
- Verify SSL is active in Vercel dashboard

### Verify Subdomain Routing

Test that middleware correctly routes:
- `sistemadeventa.com` → Public frontend
- `admin.sistemadeventa.com` → Admin panel
- `super.sistemadeventa.com` → Super admin panel

## Database Setup

### Step 1: Run Migrations

**Using Migration Script (Recommended):**
```bash
# Set DIRECT_URL environment variable
export DIRECT_URL="postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:5432/postgres"

# Run migrations
npm run deploy:migrations
# Or directly:
tsx scripts/deploy-migrations.ts
```

**Manual Migration:**
```bash
# Run each migration file in order
psql "$DIRECT_URL" -f lib/db/migrations/001_initial_schema.sql
psql "$DIRECT_URL" -f lib/db/migrations/002_rls_policies.sql
# ... continue for all 26 migrations
```

### Step 2: Verify Migrations

```sql
-- Check migration status
SELECT * FROM schema_migrations ORDER BY applied_at;

-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Step 3: Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verify policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Environment Variables

See `.env.example` for complete list of required variables.

**Critical Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (secret)
- `DATABASE_URL` - Connection pool URL
- `DIRECT_URL` - Direct connection URL (migrations)
- `JWT_SECRET` - JWT signing secret
- `ENCRYPTION_KEY` - Data encryption key
- `NEXT_PUBLIC_APP_URL` - Production domain URL

## Post-Deployment Verification

### Health Checks

**1. Main Domain:**
```bash
curl https://sistemadeventa.com
# Should return 200 OK
```

**2. Admin Subdomain:**
```bash
curl https://admin.sistemadeventa.com
# Should redirect to login if not authenticated
```

**3. Super Admin Subdomain:**
```bash
curl https://super.sistemadeventa.com
# Should redirect to login if not authenticated
```

**4. API Endpoints:**
```bash
curl https://sistemadeventa.com/api/health
# Should return health status
```

### Functionality Testing

- [ ] Public pages load correctly
- [ ] User registration works
- [ ] User login works (email + Google OAuth)
- [ ] Admin panel accessible at admin subdomain
- [ ] Super admin panel accessible at super subdomain
- [ ] Event listing page works
- [ ] Ticket purchase flow works
- [ ] Payment processing works
- [ ] Email sending works
- [ ] Scanner app functional
- [ ] Database connections working
- [ ] RLS policies enforced

### Performance Checks

- [ ] Page load times < 2 seconds
- [ ] API response times < 500ms
- [ ] Database query times acceptable
- [ ] No memory leaks
- [ ] No excessive error logs

## Monitoring Setup

### Vercel Analytics

1. Go to Project Settings → Analytics
2. Enable Vercel Analytics
3. View metrics in Vercel dashboard

### Error Tracking (Sentry)

**Setup:**
1. Create account at [sentry.io](https://sentry.io)
2. Create new project (Next.js)
3. Install Sentry:
```bash
npm install @sentry/nextjs
```

4. Configure in `sentry.client.config.ts` and `sentry.server.config.ts`
5. Add `SENTRY_DSN` to environment variables

### Uptime Monitoring

**Recommended Services:**
- UptimeRobot (free tier available)
- Pingdom
- StatusCake

**Monitor:**
- Main domain
- Admin subdomain
- Super admin subdomain
- API endpoints

### Database Monitoring

**Supabase Dashboard:**
- Monitor database size
- Track API requests
- Monitor connection pool usage
- Set up alerts for limits

## Rollback Procedure

### Quick Rollback (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"
4. Verify rollback successful

### Database Rollback

**If migrations need to be rolled back:**

1. Identify failed migration
2. Create rollback SQL script
3. Run rollback:
```bash
psql "$DIRECT_URL" -f scripts/rollback/[migration-number].sql
```

**Note:** Some migrations are not easily reversible. Always test migrations in staging first.

### Environment Variable Rollback

1. Go to Vercel → Project Settings → Environment Variables
2. Revert to previous values
3. Redeploy application

## Troubleshooting

### Build Failures

**Issue:** Build fails on Vercel
**Solutions:**
- Check build logs for specific errors
- Verify Node version (18.x+)
- Check for missing dependencies
- Verify environment variables are set

### Database Connection Errors

**Issue:** Cannot connect to Supabase
**Solutions:**
- Verify `DATABASE_URL` is correct
- Check Supabase project is active
- Verify IP allowlist (if configured)
- Check connection pool limits

### Subdomain Routing Issues

**Issue:** Subdomains not routing correctly
**Solutions:**
- Verify DNS records are correct
- Check middleware.ts subdomain detection
- Verify SSL certificates are active
- Wait for DNS propagation (up to 48 hours)

### Migration Failures

**Issue:** Migrations fail during deployment
**Solutions:**
- Use `DIRECT_URL` (not pooled connection)
- Check migration order (001-026)
- Verify database permissions
- Check for conflicting migrations

### Performance Issues

**Issue:** Slow page loads or API responses
**Solutions:**
- Enable Vercel Analytics to identify bottlenecks
- Check database query performance
- Verify connection pooling is working
- Review RLS policy performance
- Consider adding Redis caching

## Support

For deployment issues:
1. Check Vercel deployment logs
2. Check Supabase dashboard for database issues
3. Review application logs
4. Consult team documentation

## Next Steps

After successful deployment:
1. Set up monitoring (see Monitoring Setup)
2. Configure backups (see Backup Strategy)
3. Set up cost monitoring
4. Plan for scaling (see Migration Strategy)
