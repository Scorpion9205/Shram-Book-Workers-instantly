export interface GeoMember {
  lat: number;
  lng: number;
  member: string;
}

/**
 * Contract for the Redis cache service.
 * Services must NEVER touch ioredis directly — always through this interface.
 * Implementation: CacheService
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string | string[]): Promise<void>;
  exists(key: string): Promise<boolean>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  ttl(key: string): Promise<number>;

  /** Atomic set-if-not-exists. Returns true if lock was acquired. */
  setNX(key: string, value: string, ttlSeconds: number): Promise<boolean>;

  /** Geo operations */
  geoAdd(key: string, ...members: GeoMember[]): Promise<void>;
  geoSearch(key: string, lat: number, lng: number, radius: number, unit: 'km' | 'm' | 'mi' | 'ft'): Promise<string[]>;
  geoRemove(key: string, member: string): Promise<void>;
}
