# Redis Setup Guide

Guide for setting up Redis for theme caching and distributed rate limiting.

## Overview

Redis is required for:
- **Theme Caching:** Reduce database load for theme resolution
- **Distributed Rate Limiting:** Scale rate limiting across multiple servers
- **Session Storage:** Optional session storage
- **Real-time Features:** Optional pub/sub for real-time updates

## Redis Providers

### Option 1: DigitalOcean Managed Redis (Recommended)

**Pricing:**
- Basic: $15/month (1GB RAM)
- Standard: $30/month (2GB RAM)
- Premium: $60/month (4GB RAM)

**Setup:**
1. Go to DigitalOcean → Databases → Create Database
2. Select Redis
3. Choose region (same as application)
4. Configure size
5. Get connection string

**Connection String:**
```
redis://[user]:[password]@[host]:[port]
```

### Option 2: AWS ElastiCache

**Pricing:**
- Pay-as-you-go
- ~$15-30/month for small instance

**Setup:**
1. Go to AWS Console → ElastiCache
2. Create Redis cluster
3. Configure security groups
4. Get endpoint

### Option 3: Self-Hosted Redis

**Requirements:**
- VPS with Redis installed
- Persistent storage
- Backup strategy

**Setup:**
```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

## Installation

### Install Redis Client

```bash
npm install redis ioredis
```

### Choose Client Library

**Option A: `redis` (Official)**
```bash
npm install redis
```

**Option B: `ioredis` (Recommended)**
```bash
npm install ioredis
```

We'll use `ioredis` for better TypeScript support.

## Configuration

### Environment Variables

Add to `.env`:
```env
RATE_LIMIT_REDIS_URL=redis://[password]@[host]:[port]
# Or for ioredis:
REDIS_HOST=[host]
REDIS_PORT=[port]
REDIS_PASSWORD=[password]
REDIS_DB=0
```

### Create Redis Client

Create `lib/redis/client.ts`:

```typescript
import Redis from 'ioredis'

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient
  }

  const redisUrl = process.env.RATE_LIMIT_REDIS_URL

  if (!redisUrl) {
    throw new Error('RATE_LIMIT_REDIS_URL is not configured')
  }

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    reconnectOnError: (err) => {
      const targetError = 'READONLY'
      if (err.message.includes(targetError)) {
        return true
      }
      return false
    },
  })

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err)
  })

  redisClient.on('connect', () => {
    console.log('✅ Connected to Redis')
  })

  return redisClient
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}
```

## Theme Caching Implementation

### Update Theme Cache Strategy

Modify `lib/services/themes/cache-strategy.ts`:

```typescript
import { getRedisClient } from '@/lib/redis/client'

async function getFromRedisCache(cacheKey: string): Promise<Theme | null> {
  try {
    const redis = getRedisClient()
    const cached = await redis.get(cacheKey)
    
    if (cached) {
      return JSON.parse(cached) as Theme
    }
    
    return null
  } catch (error) {
    console.error('Redis cache read error:', error)
    return null
  }
}

async function setInRedisCache(
  cacheKey: string,
  theme: Theme,
  ttl: number = 3600
): Promise<void> {
  try {
    const redis = getRedisClient()
    await redis.setex(cacheKey, ttl, JSON.stringify(theme))
  } catch (error) {
    console.error('Redis cache write error:', error)
  }
}
```

## Distributed Rate Limiting

### Update Rate Limiting

Modify `lib/security/rate-limit.ts`:

```typescript
import { getRedisClient } from '@/lib/redis/client'

export async function rateLimit(
  request: NextRequest,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redisUrl = process.env.RATE_LIMIT_REDIS_URL

  if (redisUrl) {
    // Use Redis for distributed rate limiting
    return await rateLimitWithRedis(key, config)
  } else {
    // Fallback to in-memory rate limiting
    return await rateLimitInMemory(key, config)
  }
}

async function rateLimitWithRedis(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedisClient()
  const now = Date.now()
  const windowMs = config.window * 1000
  const redisKey = `rate_limit:${key}`
  
  // Get current count
  const count = await redis.incr(redisKey)
  
  // Set expiration on first request
  if (count === 1) {
    await redis.pexpire(redisKey, windowMs)
  }
  
  const ttl = await redis.pttl(redisKey)
  const resetAt = now + (ttl > 0 ? ttl : windowMs)
  
  if (count > config.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    }
  }
  
  return {
    allowed: true,
    remaining: config.requests - count,
    resetAt,
  }
}
```

## Testing

### Test Redis Connection

Create `scripts/test-redis.ts`:

```typescript
import { getRedisClient } from '../lib/redis/client'

async function testRedis() {
  try {
    const redis = getRedisClient()
    
    // Test connection
    await redis.ping()
    console.log('✅ Redis connection successful')
    
    // Test set/get
    await redis.set('test:key', 'test:value', 'EX', 60)
    const value = await redis.get('test:key')
    console.log('✅ Redis set/get successful:', value)
    
    // Test rate limiting
    const key = 'rate_limit:test'
    for (let i = 0; i < 5; i++) {
      const count = await redis.incr(key)
      console.log(`Rate limit count: ${count}`)
    }
    await redis.del(key)
    console.log('✅ Redis rate limiting test successful')
    
    await redis.quit()
    console.log('✅ All Redis tests passed')
  } catch (error) {
    console.error('❌ Redis test failed:', error)
    process.exit(1)
  }
}

testRedis()
```

## Monitoring

### Redis Metrics to Monitor

- **Memory Usage:** Monitor Redis memory
- **Connection Count:** Track active connections
- **Command Latency:** Monitor response times
- **Hit Rate:** Cache hit/miss ratio
- **Error Rate:** Track errors

### Health Checks

Create health check endpoint:

```typescript
// app/api/health/redis/route.ts
import { getRedisClient } from '@/lib/redis/client'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const redis = getRedisClient()
    await redis.ping()
    
    const info = await redis.info('server')
    
    return NextResponse.json({
      status: 'healthy',
      redis: {
        connected: true,
        version: info.match(/redis_version:(.+)/)?.[1],
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    )
  }
}
```

## Best Practices

### Connection Management

- Use connection pooling
- Handle reconnections gracefully
- Close connections properly
- Monitor connection count

### Caching Strategy

- Set appropriate TTLs
- Use namespaced keys
- Implement cache invalidation
- Monitor cache hit rates

### Error Handling

- Gracefully handle Redis failures
- Fallback to in-memory cache
- Log errors for monitoring
- Alert on persistent failures

## Troubleshooting

### Connection Issues

**Problem:** Cannot connect to Redis
**Solutions:**
- Verify connection string
- Check firewall rules
- Verify credentials
- Check Redis is running

### Performance Issues

**Problem:** Slow Redis operations
**Solutions:**
- Check network latency
- Monitor Redis memory
- Optimize key structure
- Consider Redis cluster

### Memory Issues

**Problem:** Redis out of memory
**Solutions:**
- Increase Redis memory
- Implement eviction policy
- Reduce TTLs
- Monitor key count

## Security

### Authentication

- Always use password authentication
- Use strong passwords
- Rotate passwords regularly
- Use SSL/TLS for connections

### Network Security

- Restrict access to Redis port
- Use VPC/private networks
- Implement firewall rules
- Monitor access logs

## Backup and Recovery

### Backup Strategy

- Redis persistence (RDB/AOF)
- Regular backups
- Test restore procedures
- Document recovery process

### Disaster Recovery

- Replicate Redis (if using cluster)
- Document recovery procedures
- Test failover scenarios
- Maintain backup copies

## Cost Optimization

### Right-Sizing

- Start with smallest instance
- Monitor usage
- Scale up as needed
- Use reserved instances for savings

### Optimization

- Monitor memory usage
- Implement key expiration
- Use compression for large values
- Optimize data structures

## Next Steps

After Redis setup:
1. Test theme caching
2. Test rate limiting
3. Monitor performance
4. Optimize configuration
5. Set up alerts
