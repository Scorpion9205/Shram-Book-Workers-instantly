import { redis } from "../../config/redis.js";

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

}