import { Redis } from 'ioredis';
import type { ICacheService, GeoMember } from '../../core/interfaces/ICacheService.js';
import { Logger } from '../../core/logger/Logger.js';

/**
 * CacheService implementation using ioredis.
 * Decouples domain services from the concrete Redis client.
 */
export class CacheService implements ICacheService {
  private readonly logger = new Logger('CacheService');

  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (err) {
      this.logger.error(`Redis GET error for key ${key}`, err);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (err) {
      this.logger.error(`Redis SET error for key ${key}`, err);
    }
  }

  async del(key: string | string[]): Promise<void> {
    try {
      if (Array.isArray(key)) {
        if (key.length > 0) {
          await this.redis.del(...key);
        }
      } else {
        await this.redis.del(key);
      }
    } catch (err) {
      this.logger.error('Redis DEL error', err, { key });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const count = await this.redis.exists(key);
      return count === 1;
    } catch (err) {
      this.logger.error(`Redis EXISTS error for key ${key}`, err);
      return false;
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const value = await this.redis.incr(key);
      if (ttlSeconds && value === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      return value;
    } catch (err) {
      this.logger.error(`Redis INCR error for key ${key}`, err);
      throw err;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.expire(key, ttlSeconds);
    } catch (err) {
      this.logger.error(`Redis EXPIRE error for key ${key}`, err);
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (err) {
      this.logger.error(`Redis TTL error for key ${key}`, err);
      return -2;
    }
  }

  async setNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (err) {
      this.logger.error(`Redis SETNX error for key ${key}`, err);
      return false;
    }
  }

  async geoAdd(key: string, ...members: GeoMember[]): Promise<void> {
    try {
      if (members.length === 0) return;
      const args: (string | number)[] = [];
      for (const m of members) {
        args.push(m.lng, m.lat, m.member);
      }
      await this.redis.geoadd(key, ...args);
    } catch (err) {
      this.logger.error(`Redis GEOADD error for key ${key}`, err);
    }
  }

  async geoSearch(
    key: string,
    lat: number,
    lng: number,
    radius: number,
    unit: 'km' | 'm' | 'mi' | 'ft',
  ): Promise<string[]> {
    try {
      // GEORADIUS key longitude latitude radius m|km|ft|mi
      return (await this.redis.georadius(key, lng, lat, radius, unit)) as string[];
    } catch (err) {
      this.logger.error(`Redis GEOSEARCH error for key ${key}`, err);
      return [];
    }
  }

  async geoRemove(key: string, member: string): Promise<void> {
    try {
      await this.redis.zrem(key, member);
    } catch (err) {
      this.logger.error(`Redis GEOREMOVE error for key ${key} and member ${member}`, err);
    }
  }
}
