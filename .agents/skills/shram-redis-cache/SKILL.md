---
name: shram-redis-cache
description: >-
  Use this skill when implementing Redis caching in SHRAM: CacheService setup,
  cache key conventions (CacheKeys), TTL guidelines, geo operations, atomic
  locks (SETNX), session/token storage, and PlatformSetting cache invalidation.
  Activate when: user asks about Redis, caching, rate limiting with Redis,
  geo-indexing workers, or CacheService implementation.
---

# SHRAM — Redis Cache Service

## CacheService Implementation

```typescript
// cache/CacheService.ts
import { Redis } from 'ioredis';
import type { ICacheService, GeoMember } from './ICacheService.js';
import { Logger } from '../core/logger/Logger.js';

export class CacheService implements ICacheService {
  private readonly logger = new Logger('CacheService');

  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) {
      await this.redis.del(...key);
    } else {
      await this.redis.del(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const value = await this.redis.incr(key);
    if (ttlSeconds && value === 1) {
      // Set TTL only on first increment
      await this.redis.expire(key, ttlSeconds);
    }
    return value;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(key, ttlSeconds);
  }

  // Atomic lock — returns true if lock acquired, false if already locked
  async setNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  // Geo operations
  async geoAdd(key: string, ...members: GeoMember[]): Promise<void> {
    const args = members.flatMap(m => [m.lng, m.lat, m.member]);
    await this.redis.geoadd(key, ...args);
  }

  async geoSearch(
    key: string,
    lat: number,
    lng: number,
    radius: number,
    unit: 'km' | 'm' | 'mi' | 'ft',
  ): Promise<string[]> {
    return this.redis.georadius(key, lng, lat, radius, unit);
  }

  async geoRemove(key: string, member: string): Promise<void> {
    await this.redis.zrem(key, member);
  }

  // TTL check
  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  // Pub/Sub
  async publish(channel: string, message: string): Promise<void> {
    await this.redis.publish(channel, message);
  }
}
```

## Cache Keys Convention (cacheKeys.ts)

```typescript
// cache/cacheKeys.ts
export const CacheKeys = {
  // Auth
  refreshToken: (userId: string) => `auth:refresh:${userId}`,
  otpCode: (identifier: string) => `otp:code:${identifier}`,
  otpAttempts: (identifier: string) => `otp:attempts:${identifier}`,
  pendingSignup: (identifier: string) => `signup:pending:${identifier}`,
  resetPassword: (token: string) => `auth:reset:${token}`,

  // Worker presence & location
  workerStatus: (workerId: string) => `worker:status:${workerId}`,
  workerLocation: 'geo:workers:online',

  // Instant Request
  instantRequestLock: (requestId: string) => `ir:lock:${requestId}`,
  instantRequestBroadcastSet: (requestId: string) => `ir:workers:${requestId}`,

  // Platform settings (cached short-term)
  platformSetting: (key: string) => `platform:setting:${key}`,
  platformSettingAll: 'platform:settings:all',

  // Idempotency
  idempotency: (key: string) => `idempotency:${key}`,

  // Rate limiting
  rateLimit: (identifier: string, action: string) => `ratelimit:${action}:${identifier}`,

  // Bidding
  biddingLock: (biddingId: string) => `bidding:lock:${biddingId}`,
  biddingBids: (biddingId: string) => `bidding:bids:${biddingId}`,
} as const;
```

## Redis Bootstrap

```typescript
// bootstrap/redis.bootstrap.ts
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { Logger } from '../core/logger/Logger.js';

const logger = new Logger('Redis');

export function createRedisClient(): Redis {
  const redis = new Redis(env.REDIS_URL, {
    retryStrategy: (times) => Math.min(times * 100, 3000),
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  });

  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (err) => logger.error('Redis error', err));
  redis.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  return redis;
}
```

## TTL Guidelines

| Key Type | TTL |
|---|---|
| Access token (in Redis) | Not stored — stateless JWT |
| Refresh token | 7 days (604800s) |
| OTP code | 5 minutes (300s) |
| OTP rate limit counter | 1 hour (3600s) |
| Pending signup | 15 minutes (900s) |
| Password reset token | 15 minutes (900s) |
| Worker online status | 5 minutes (300s) — refreshed on location update |
| Platform settings cache | 60 seconds |
| Idempotency key | 24 hours (86400s) |
| Instant request lock | 30 seconds |

## Idempotency Pattern

```typescript
// For payment order create and OTP verify endpoints
export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (!idempotencyKey) return next();

  const cacheKey = CacheKeys.idempotency(idempotencyKey);
  const cached = await cacheService.get<object>(cacheKey);

  if (cached) {
    return res.status(200).json(cached); // Return cached response
  }

  // Wrap response to cache it
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      cacheService.set(cacheKey, body, 86400).catch(console.error);
    }
    return originalJson(body);
  };

  next();
};
```
