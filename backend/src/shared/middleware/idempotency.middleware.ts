import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";
import { redis } from "../config/redis.js";

export const idempotencyMiddleware = (ttlSeconds = 24 * 60 * 60) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = req.headers["idempotency-key"] as string | undefined;

    if (!key) {
      return next();
    }

    const redisKey = `idempotency:${key}`;

    try {
      const cached = await redis.get(redisKey);
      if (cached) {
        const { status, body } = JSON.parse(cached);
        return res.status(status).json(body);
      }

      // Intercept res.json to cache response
      const originalJson = res.json;
      res.json = function (body: any): Response {
        const status = res.statusCode;
        const responseData = { status, body };
        
        // Cache response in redis asynchronously
        redis.set(redisKey, JSON.stringify(responseData), "EX", ttlSeconds).catch(err => {
          console.error("Failed to set idempotency cache in Redis:", err);
        });

        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error("Idempotency Middleware Error:", error);
      next();
    }
  };
};
