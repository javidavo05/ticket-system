# Deployment Documentation

Complete documentation for deploying and maintaining the ticketing platform.

## Quick Start

1. Read [DEPLOYMENT.md](../DEPLOYMENT.md) for step-by-step deployment guide
2. Use [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) during deployment
3. Set up monitoring using [MONITORING_SETUP.md](./MONITORING_SETUP.md)
4. Configure backups using [BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md)

## Documentation Index

### Deployment Guides

- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Complete deployment guide
  - Vercel setup
  - Domain configuration
  - Database migrations
  - Post-deployment verification

- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Quick reference checklist
  - Pre-deployment checklist
  - Deployment steps
  - Post-deployment verification

### Infrastructure

- **[REDIS_SETUP.md](./REDIS_SETUP.md)** - Redis configuration
  - Setup for theme caching
  - Distributed rate limiting
  - Monitoring and optimization

- **[BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md)** - Backup and disaster recovery
  - Backup procedures
  - Restoration steps
  - Disaster recovery plan

### Operations

- **[MONITORING_SETUP.md](./MONITORING_SETUP.md)** - Monitoring configuration
  - Vercel Analytics
  - Error tracking (Sentry)
  - Uptime monitoring
  - Database monitoring

- **[COST_OPTIMIZATION.md](./COST_OPTIMIZATION.md)** - Cost management
  - Cost monitoring
  - Optimization strategies
  - Migration planning

## Scripts

### Deployment Scripts

- **`scripts/deploy-migrations.ts`** - Run database migrations
  ```bash
  DIRECT_URL="..." npm run deploy:migrations
  ```

- **`scripts/migrate-to-self-hosted.ts`** - Migration to self-hosted infrastructure
  ```bash
  tsx scripts/migrate-to-self-hosted.ts --phase=dual-write
  ```

## Environment Variables

See [`.env.example`](../.env.example) for complete list of required environment variables.

## Quick Reference

### Common Commands

```bash
# Run migrations
DIRECT_URL="..." npm run deploy:migrations

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

### Health Checks

```bash
# Main domain
curl https://sistemadeventa.com/api/health

# Admin subdomain
curl https://admin.sistemadeventa.com

# Super admin subdomain
curl https://super.sistemadeventa.com
```

## Support

For deployment issues:
1. Check [DEPLOYMENT.md](../DEPLOYMENT.md) troubleshooting section
2. Review monitoring dashboards
3. Check error logs
4. Consult team documentation

## Next Steps

After deployment:
1. Set up monitoring (see [MONITORING_SETUP.md](./MONITORING_SETUP.md))
2. Configure backups (see [BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md))
3. Set up cost tracking (see [COST_OPTIMIZATION.md](./COST_OPTIMIZATION.md))
4. Plan for scaling (see migration strategy in plan)
