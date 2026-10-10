import { Redis } from "ioredis";
import { env } from "../../config/env.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
  console.log("✅ Redis Connected");
});

redis.on("error", (error) => {
  console.error("❌ Redis Error:", error);
});
