export declare class RedisService {
    static set(key: string, value: unknown, ttl?: number): Promise<void>;
    static get<T>(key: string): Promise<T | null>;
    static del(key: string): Promise<void>;
    static exists(key: string): Promise<number>;
    static acquireLock(key: string, ttlSeconds?: number): Promise<string | null>;
    static releaseLock(key: string, token: string): Promise<void>;
    static deletePattern(pattern: string): Promise<void>;
    static geoAdd(key: string, longitude: number, latitude: number, member: string): Promise<void>;
    static geoRemove(key: string, member: string): Promise<void>;
    static geoSearch(key: string, longitude: number, latitude: number, radiusKm: number): Promise<string[]>;
}
//# sourceMappingURL=redis.service.d.ts.map