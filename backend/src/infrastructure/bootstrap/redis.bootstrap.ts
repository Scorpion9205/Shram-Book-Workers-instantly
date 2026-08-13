import { Redis } from 'ioredis';
import { env } from '../../config/env.js';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger('RedisBootstrap');

/**
 * Initializes and returns a configured ioredis client.
 */
export function createRedisClient(): Redis {
  const redis = new Redis(env.REDIS_URL, {
    retryStrategy: (times) => Math.min(times * 100, 3000),
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  });

  redis.on('connect', () => logger.info('Redis client connected'));
  redis.on('error', (err) => logger.error('Redis client connection error', err));
  redis.on('reconnecting', () => logger.warn('Redis client reconnecting...'));

  return redis;
}
