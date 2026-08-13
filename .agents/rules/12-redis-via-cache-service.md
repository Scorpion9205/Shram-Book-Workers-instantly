# SHRAM Coding Rules — Redis Via CacheService

## Rule 12: Redis Is Only Accessed Through CacheService Abstraction

Direct `ioredis` client access is forbidden outside the `CacheService` class. All caching, session storage, geo-queries, and pub/sub go through the abstraction layer.

### ✅ CORRECT

```typescript
// Injecting and using CacheService
export class InstantRequestService implements IInstantRequestService {
  constructor(private readonly cache: ICacheService) {}

  async setWorkerOnline(workerId: string, lat: number, lng: number): Promise<void> {
    await this.cache.geoAdd('workers:online', { lat, lng, member: workerId });
    await this.cache.set(`worker:status:${workerId}`, 'ONLINE', 300);
  }

  async findEligibleWorkers(lat: number, lng: number, radiusKm: number): Promise<string[]> {
    return this.cache.geoSearch('workers:online', lat, lng, radiusKm, 'km');
  }
}
```

### ❌ WRONG — Direct ioredis / RedisService

```typescript
// ❌ static RedisService call in a service
import { RedisService } from '../../shared/services/redis/redis.service.js';
await RedisService.set(`refresh:${user.id}`, token, 7 * 24 * 60 * 60);

// ❌ importing ioredis directly
import { Redis } from 'ioredis';
const redis = new Redis();
await redis.set('key', 'value');
```

### CacheService Interface

```typescript
// cache/ICacheService.ts
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string | string[]): Promise<void>;
  exists(key: string): Promise<boolean>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  setNX(key: string, value: string, ttlSeconds: number): Promise<boolean>; // atomic lock
  geoAdd(key: string, ...members: GeoMember[]): Promise<void>;
  geoSearch(key: string, lat: number, lng: number, radius: number, unit: 'km'): Promise<string[]>;
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, callback: (msg: string) => void): Promise<void>;
}
```

### Cache Key Conventions (cacheKeys.ts)

```typescript
// cache/cacheKeys.ts — ALL cache keys defined here, never inline strings
export const CacheKeys = {
  refreshToken: (userId: string) => `refresh:${userId}`,
  otpCode: (identifier: string) => `otp:${identifier}`,
  otpAttempts: (identifier: string) => `otp:attempts:${identifier}`,
  pendingSignup: (identifier: string) => `pending-signup:${identifier}`,
  resetPassword: (token: string) => `reset-password:${token}`,
  workerStatus: (workerId: string) => `worker:status:${workerId}`,
  workerLocation: 'workers:geo',
  instantRequestLock: (requestId: string) => `ir:lock:${requestId}`,
  platformSetting: (key: string) => `platform:setting:${key}`,
  idempotency: (key: string) => `idempotency:${key}`,
} as const;
```

No cache key string should be hard-coded inline in a service — always use `CacheKeys.xxx()`.
