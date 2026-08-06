import dotenv from "dotenv";
dotenv.config();
import { Redis } from "ioredis";
export const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
});
redis.on("connect", () => {
    console.log("✅ Redis Connected");
});
redis.on("error", (error) => {
    console.error("❌ Redis Error:", error);
});
console.log("HOST:", process.env.REDIS_HOST);
console.log("PORT:", process.env.REDIS_PORT);
//# sourceMappingURL=redis.js.map