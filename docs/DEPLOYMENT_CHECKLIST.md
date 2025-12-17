# Deployment Checklist

Quick reference checklist for deploying the ticketing platform.

## Pre-Deployment

### Code Quality
- [ ] All tests passing
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] No console errors in development
- [ ] All migrations tested locally

### Security
- [ ] All secrets in environment variables (not in code)
- [ ] `.env` files in `.gitignore`
- [ ] No hardcoded credentials
- [ ] Security headers configured in `vercel.json`
- [ ] CORS properly configured
- [ ] Rate limiting enabled

### Database
- [ ] All migrations tested
- [ ] Database backups configured
- [ ] RLS policies verified
- [ ] Indexes created
- [ ] Connection pooling configured

### Configuration
- [ ] All environment variables documented (`.env.example`)
- [ ] Vercel project configured
- [ ] Domain DNS configured
- [ ] SSL certificates ready
- [ ] Subdomain routing tested

## Deployment

### Initial Deployment
- [ ] Push code to main branch
- [ ] Vercel auto-deploys
- [ ] Verify build succeeds
- [ ] Check deployment logs
- [ ] Verify environment variables set

### Database Setup
- [ ] Run all migrations on production DB
  ```bash
  DIRECT_URL="..." npm run deploy:migrations
  ```
- [ ] Verify migrations succeeded
- [ ] Test database connections
- [ ] Verify RLS policies active

### Domain Configuration
- [ ] Main domain working
- [ ] Admin subdomain routing correctly
- [ ] Super admin subdomain routing correctly
- [ ] SSL certificates active
- [ ] DNS propagation complete

### Functionality Testing
- [ ] Public pages load
- [ ] Authentication works
- [ ] Admin panel accessible
- [ ] Super admin panel accessible
- [ ] API endpoints respond
- [ ] Payment flows work
- [ ] Email sending works
- [ ] Scanner app functional

## Post-Deployment

### Monitoring
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured (Sentry)
- [ ] Uptime monitoring active
- [ ] Performance monitoring active
- [ ] Database monitoring active

### Documentation
- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] Rollback procedure documented
- [ ] Team trained on new deployment

### Backup & Recovery
- [ ] Database backups automated
- [ ] Backup restoration tested
- [ ] Rollback procedure tested
- [ ] Disaster recovery plan documented

## Quick Commands

### Run Migrations
```bash
DIRECT_URL="postgresql://..." npm run deploy:migrations
```

### Check Deployment
```bash
curl https://sistemadeventa.com/api/health
```

### View Logs
- Vercel Dashboard → Deployments → [Deployment] → Logs
- Supabase Dashboard → Logs

### Rollback
- Vercel Dashboard → Deployments → [Previous Deployment] → Promote to Production

## Emergency Contacts

- **Vercel Support:** support@vercel.com
- **Supabase Support:** support@supabase.com
- **On-Call Engineer:** [Contact]

## Documentation References

- [DEPLOYMENT.md](../DEPLOYMENT.md) - Full deployment guide
- [BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md) - Backup procedures
- [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Monitoring setup
- [COST_OPTIMIZATION.md](./COST_OPTIMIZATION.md) - Cost optimization
- [REDIS_SETUP.md](./REDIS_SETUP.md) - Redis configuration
