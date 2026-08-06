import { redis } from "../../config/redis.js";
import { randomUUID } from "crypto";
export class RedisService {
    static async set(key, value, ttl) {
        const data = typeof value === "string"
            ? value
            : JSON.stringify(value);
        if (ttl) {
            await redis.set(key, data, "EX", ttl);
            return;
        }
        await redis.set(key, data);
        console.log("SET:", key, data);
    }
    static async get(key) {
        const data = await redis.get(key);
        if (!data) {
            return null;
        }
        console.log("GET:", key);
        console.log("REDIS RETURN:", data);
        try {
            return JSON.parse(data);
        }
        catch {
            return data;
        }
    }
    static async del(key) {
        await redis.del(key);
    }
    static async exists(key) {
        return await redis.exists(key);
    }
    static async acquireLock(key, ttlSeconds = 10) {
        const token = randomUUID();
        const result = await redis.set(key, token, "EX", ttlSeconds, "NX");
        if (result !== "OK") {
            return null;
        }
        return token;
    }
    static async releaseLock(key, token) {
        const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;
        await redis.eval(script, 1, key, token);
    }
    static async deletePattern(pattern) {
        let cursor = "0";
        do {
            const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
            cursor = nextCursor;
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== "0");
    }
}
//# sourceMappingURL=redis.service.js.map