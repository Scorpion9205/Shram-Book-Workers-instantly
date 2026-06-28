import { redis } from "../../config/redis.js";
import { randomUUID } from "crypto";
export class RedisService {

  static async set(
    key: string,
    value: unknown,
    ttl?: number
  ) {

    const data =
      typeof value === "string"
        ? value
        : JSON.stringify(value);

    if (ttl) {

      await redis.set(
        key,
        data,
        "EX",
        ttl
      );

      return;
    }

    await redis.set(key, data);

  }

  static async get<T>(
    key: string
  ): Promise<T | null> {

    const data =
      await redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as T;
    } catch {
      return data as T;
    }

  }

  static async del(
    key: string
  ) {

    await redis.del(key);

  }

  static async exists(
    key: string
  ) {

    return await redis.exists(key);

  }

 static async acquireLock(
  key: string,
  ttlSeconds = 10
): Promise<string | null> {

  const token = randomUUID();

  const result = await redis.set(
    key,
    token,
    "EX",
    ttlSeconds,
    "NX"
  );

  if (result !== "OK") {
    return null;
  }

  return token;
}
static async releaseLock(
  key: string,
  token: string
) {

  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

  await redis.eval(
    script,
    1,
    key,
    token
  );

}
static async deletePattern(
  pattern: string
) {

  let cursor = "0";

  do {

    const [nextCursor, keys] =
      await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );

    cursor = nextCursor;

    if (keys.length > 0) {

      await redis.del(...keys);

    }

  } while (cursor !== "0");

}

}