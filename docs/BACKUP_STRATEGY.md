# Backup and Disaster Recovery Strategy

## Overview

This document outlines the backup strategy, restoration procedures, and disaster recovery plan for the ticketing platform.

## Backup Strategy

### Database Backups

**Supabase Automated Backups:**
- **Frequency:** Daily automated backups (Pro tier)
- **Retention:** 7 days (Pro tier), 1 day (Free tier)
- **Location:** Managed by Supabase
- **Access:** Via Supabase Dashboard → Database → Backups

**Manual Backups:**
```bash
# Full database backup
pg_dump "$DIRECT_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump "$DIRECT_URL" | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

**Backup Schedule:**
- **Daily:** Automated via Supabase (Pro tier)
- **Weekly:** Manual full backup before major deployments
- **Before Migrations:** Always backup before running migrations
- **Before Major Changes:** Backup before schema changes

### Backup Storage

**Primary Storage:**
- Supabase managed backups (automated)
- Local/cloud storage for manual backups

**Secondary Storage (Recommended):**
- AWS S3 bucket for long-term retention
- DigitalOcean Spaces
- Encrypted local storage

**Backup Retention Policy:**
- **Daily backups:** 7 days
- **Weekly backups:** 4 weeks
- **Monthly backups:** 12 months
- **Pre-migration backups:** 3 months

### Automated Backup Script

Create `scripts/backup-database.ts`:

```typescript
// Automated backup script
// Run via cron: 0 2 * * * (daily at 2 AM)
```

## Restoration Procedures

### Full Database Restoration

**From Supabase Backup:**
1. Go to Supabase Dashboard → Database → Backups
2. Select backup point
3. Click "Restore"
4. Verify restoration success

**From Manual Backup:**
```bash
# Restore from SQL file
psql "$DIRECT_URL" < backup_20240115_020000.sql

# Restore from compressed backup
gunzip < backup_20240115_020000.sql.gz | psql "$DIRECT_URL"
```

### Partial Restoration

**Restore Specific Table:**
```bash
# Export specific table
pg_dump "$DIRECT_URL" -t table_name > table_backup.sql

# Restore specific table
psql "$DIRECT_URL" < table_backup.sql
```

**Restore Specific Data:**
```sql
-- Use transaction for safety
BEGIN;

-- Restore data
INSERT INTO table_name SELECT * FROM backup_table;

-- Verify
SELECT COUNT(*) FROM table_name;

-- Commit or rollback
COMMIT; -- or ROLLBACK;
```

### Point-in-Time Recovery

**Supabase (Pro tier):**
- Point-in-time recovery available
- Access via Supabase Dashboard
- Can restore to any point within retention period

**Self-Hosted:**
- Requires WAL archiving
- Use pg_basebackup for continuous archiving
- Restore using pg_recovery

## Disaster Recovery Plan

### Recovery Time Objectives (RTO)

- **Critical Systems:** < 1 hour
- **Non-Critical Systems:** < 4 hours
- **Full System Recovery:** < 24 hours

### Recovery Point Objectives (RPO)

- **Database:** < 1 hour (daily backups)
- **Application Code:** < 15 minutes (Git version control)
- **Configuration:** < 1 hour (environment variables)

### Disaster Scenarios

#### Scenario 1: Database Corruption

**Symptoms:**
- Database queries failing
- Data inconsistencies
- Application errors

**Recovery Steps:**
1. Immediately stop application writes
2. Identify corruption scope
3. Restore from most recent backup
4. Verify data integrity
5. Resume application operations
6. Investigate root cause

**Estimated Recovery Time:** 1-2 hours

#### Scenario 2: Accidental Data Deletion

**Symptoms:**
- Missing data in specific tables
- Application errors related to missing records

**Recovery Steps:**
1. Identify affected tables/records
2. Restore from backup (point-in-time if available)
3. Verify restored data
4. Resume operations
5. Review access controls

**Estimated Recovery Time:** 30 minutes - 2 hours

#### Scenario 3: Complete Infrastructure Failure

**Symptoms:**
- Complete service outage
- Cannot access Supabase
- Application unavailable

**Recovery Steps:**
1. Activate disaster recovery site (if available)
2. Restore database from backup
3. Deploy application to backup infrastructure
4. Update DNS to point to backup site
5. Verify all systems operational
6. Investigate root cause

**Estimated Recovery Time:** 4-24 hours

#### Scenario 4: Security Breach

**Symptoms:**
- Unauthorized access detected
- Data exfiltration
- Compromised credentials

**Recovery Steps:**
1. Immediately isolate affected systems
2. Rotate all credentials (database, API keys, etc.)
3. Assess data breach scope
4. Restore from pre-breach backup if needed
5. Patch security vulnerabilities
6. Notify affected users (if required)
7. Conduct security audit

**Estimated Recovery Time:** 4-48 hours

### Backup Verification

**Weekly Verification:**
- Test restore from most recent backup
- Verify data integrity
- Document any issues

**Monthly Verification:**
- Full disaster recovery drill
- Test all recovery procedures
- Update documentation based on findings

## Monitoring and Alerts

### Backup Monitoring

**Metrics to Monitor:**
- Backup success/failure
- Backup size
- Backup duration
- Storage usage

**Alerts:**
- Backup failure → Immediate alert
- Backup size anomaly → Alert if > 20% change
- Storage approaching limit → Alert at 80%

### Database Health Monitoring

**Metrics:**
- Database size
- Connection pool usage
- Query performance
- Error rates

**Alerts:**
- Database size > 80% of limit
- Connection pool > 80% usage
- Query time > 5 seconds
- Error rate > 1%

## Backup Testing

### Test Schedule

- **Weekly:** Test restore from daily backup
- **Monthly:** Full disaster recovery drill
- **Quarterly:** Test point-in-time recovery
- **Before Major Changes:** Test backup/restore procedure

### Test Procedure

1. Create test environment
2. Restore backup to test environment
3. Verify data integrity
4. Test application functionality
5. Document results
6. Update procedures if needed

## Documentation

### Backup Logs

Maintain logs of:
- Backup execution times
- Backup sizes
- Restoration tests
- Issues encountered

### Runbook

Keep updated runbook with:
- Step-by-step restoration procedures
- Contact information
- Escalation procedures
- Recovery time estimates

## Compliance and Retention

### Data Retention Requirements

- **Financial Records:** 7 years (audit logs, payments)
- **User Data:** Per privacy policy
- **Event Data:** 2 years minimum
- **Backup Retention:** Per retention policy

### Compliance

- Ensure backups meet regulatory requirements
- Encrypt backups containing sensitive data
- Maintain audit trail of backup/restore operations
- Document retention policies

## Automation

### Automated Backup Script

Create cron job for daily backups:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

### Backup Verification

Automated verification:
- Check backup file exists
- Verify backup file size
- Test backup integrity
- Alert on failures

## Contact and Escalation

### Primary Contacts

- **Database Administrator:** [Contact]**
- **DevOps Engineer:** [Contact]**
- **On-Call Engineer:** [Contact]**

### Escalation Path

1. **Level 1:** Automated alerts
2. **Level 2:** On-call engineer
3. **Level 3:** Database administrator
4. **Level 4:** CTO/Technical Lead

## Review and Updates

This document should be reviewed:
- **Quarterly:** Review and update procedures
- **After Incidents:** Update based on lessons learned
- **After Infrastructure Changes:** Update procedures
- **Annually:** Full review and update
