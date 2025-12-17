# Monitoring Setup Guide

Complete guide for setting up monitoring, error tracking, and alerting for the ticketing platform.

## Overview

This guide covers:
- Vercel Analytics setup
- Error tracking with Sentry
- Uptime monitoring
- Database monitoring
- Performance monitoring
- Cost monitoring

## Vercel Analytics

### Setup

1. **Enable in Vercel Dashboard:**
   - Go to Project Settings → Analytics
   - Click "Enable Vercel Analytics"
   - Analytics will start collecting data automatically

2. **View Metrics:**
   - Go to Analytics tab in Vercel dashboard
   - View real-time and historical metrics
   - Track page views, unique visitors, top pages

### Metrics Tracked

- Page views
- Unique visitors
- Top pages
- Referrers
- Geographic data
- Device/browser data

### Cost

- **Free:** Included with Vercel Pro tier
- **Enterprise:** Advanced analytics features

## Error Tracking (Sentry)

### Installation

```bash
npm install @sentry/nextjs
```

### Configuration

**1. Create Sentry Project:**
- Go to [sentry.io](https://sentry.io)
- Create new project (Next.js)
- Copy DSN

**2. Initialize Sentry:**

Create `sentry.client.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

Create `sentry.server.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})
```

**3. Add to `next.config.js`:**
```javascript
const { withSentryConfig } = require('@sentry/nextjs')

module.exports = withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: 'your-org',
    project: 'your-project',
  }
)
```

**4. Add Environment Variables:**
```env
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
SENTRY_AUTH_TOKEN=your-auth-token
```

### Features

- **Error Tracking:** Automatic error capture
- **Performance Monitoring:** Track API response times
- **Session Replay:** Record user sessions
- **Release Tracking:** Track deployments
- **Alerting:** Email/Slack notifications

### Cost

- **Free Tier:** 5,000 events/month
- **Team:** $26/month (50,000 events)
- **Business:** Custom pricing

## Uptime Monitoring

### Recommended Services

**1. UptimeRobot (Free Tier Available)**
- URL: https://uptimerobot.com
- Free: 50 monitors, 5-minute intervals
- Paid: $7/month (1-minute intervals)

**Setup:**
1. Create account
2. Add monitors for:
   - `https://sistemadeventa.com`
   - `https://admin.sistemadeventa.com`
   - `https://super.sistemadeventa.com`
   - `https://sistemadeventa.com/api/health`
3. Configure alert contacts (email/SMS)
4. Set up status page (optional)

**2. Pingdom**
- URL: https://www.pingdom.com
- Pricing: $15/month
- Features: Advanced monitoring, real user monitoring

**3. StatusCake**
- URL: https://www.statuscake.com
- Free tier available
- Features: SSL monitoring, domain monitoring

### Monitoring Endpoints

Create health check endpoint: `app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check database connection
    // Check critical services
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        // Add other service checks
      },
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    )
  }
}
```

## Database Monitoring

### Supabase Dashboard

**Metrics Available:**
- Database size
- API requests
- Bandwidth usage
- Connection pool usage
- Query performance
- Error rates

**Access:**
- Go to Supabase Dashboard
- Navigate to Project → Database
- View metrics and logs

### Custom Database Monitoring

**Key Metrics to Track:**
- Database size (alert at 80% of limit)
- API requests per second
- Connection pool usage
- Query response times
- Error rates
- Slow queries

**Alerts:**
- Database size > 80% → Alert
- API requests > 400/second → Alert
- Connection pool > 80% → Alert
- Error rate > 1% → Alert

## Performance Monitoring

### Vercel Analytics

- Built-in performance metrics
- Core Web Vitals tracking
- Real User Monitoring (RUM)

### Custom Performance Tracking

**Track Key Metrics:**
- Page load times
- API response times
- Database query times
- Time to First Byte (TTFB)
- Largest Contentful Paint (LCP)

**Implementation:**
```typescript
// Track API performance
export async function trackAPIPerformance(
  endpoint: string,
  duration: number
) {
  // Send to monitoring service
  if (duration > 1000) {
    console.warn(`Slow API: ${endpoint} took ${duration}ms`)
  }
}
```

## Cost Monitoring

### Vercel Cost Tracking

**Monitor:**
- Bandwidth usage
- Function invocations
- Edge requests
- Build minutes

**Access:**
- Vercel Dashboard → Usage
- Set up billing alerts

### Supabase Cost Tracking

**Monitor:**
- Database size
- API requests
- Bandwidth
- Storage usage

**Access:**
- Supabase Dashboard → Settings → Usage
- Set up usage alerts

### Cost Dashboard

**Create Custom Dashboard:**
- Track monthly costs
- Set budget alerts
- Monitor cost trends
- Identify cost spikes

**Tools:**
- Google Sheets with API integrations
- Custom dashboard (Next.js admin page)
- Third-party cost tracking tools

## Alert Configuration

### Alert Channels

**Email:**
- Primary alert channel
- Configure for all critical alerts

**SMS:**
- For critical alerts only
- Use services like Twilio

**Slack:**
- Team notifications
- Integration with monitoring services

**PagerDuty:**
- For on-call rotation
- Escalation policies

### Alert Thresholds

**Critical (Immediate Response):**
- Service down
- Database connection failure
- Payment processing errors
- Security breaches

**Warning (Monitor Closely):**
- Database size > 80%
- API requests > 400/second
- Error rate > 1%
- Response time > 2 seconds

**Info (Review Weekly):**
- Cost increase > 20%
- Usage approaching limits
- Performance degradation

## Dashboard Setup

### Recommended Dashboards

**1. Operations Dashboard:**
- System health
- Error rates
- Response times
- Uptime status

**2. Business Dashboard:**
- User metrics
- Transaction volume
- Revenue metrics
- Event statistics

**3. Technical Dashboard:**
- Database metrics
- API performance
- Infrastructure costs
- Resource usage

### Tools

- **Grafana:** Custom dashboards
- **Datadog:** Comprehensive monitoring
- **New Relic:** Application performance
- **Custom Next.js Admin Page:** Internal dashboard

## Best Practices

### Monitoring Checklist

- [ ] Vercel Analytics enabled
- [ ] Sentry error tracking configured
- [ ] Uptime monitoring active
- [ ] Database monitoring configured
- [ ] Performance tracking enabled
- [ ] Cost monitoring set up
- [ ] Alerts configured and tested
- [ ] Dashboards created
- [ ] On-call rotation established
- [ ] Runbooks documented

### Regular Reviews

- **Daily:** Check error rates and alerts
- **Weekly:** Review performance metrics
- **Monthly:** Analyze cost trends
- **Quarterly:** Review and optimize monitoring

## Support and Resources

### Documentation

- [Vercel Analytics Docs](https://vercel.com/docs/analytics)
- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Supabase Monitoring](https://supabase.com/docs/guides/platform/metrics)

### Getting Help

- Vercel Support: support@vercel.com
- Sentry Support: support@sentry.io
- Supabase Support: support@supabase.com
