import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";
import { redis } from "../config/redis.js";

const PROCESSING_MARKER = JSON.stringify({ status: "PROCESSING" });

export const idempotencyMiddleware = (ttlSeconds = 24 * 60 * 60) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = req.headers["idempotency-key"] as string | undefined;

    if (!key) {
      return next();
    }

    const redisKey = `idempotency:${key}`;

    try {
      // Atomic claim: SET ... NX means only one concurrent request with this key can win the
      // claim. Previously this was a GET (check) then, only after the handler ran, a
      // fire-and-forget SET — two concurrent requests with the same key both passed the GET
      // check (neither had written yet) and both ran the handler, defeating idempotency.
      const claimed = await redis.set(redisKey, PROCESSING_MARKER, "EX", ttlSeconds, "NX");

      if (!claimed) {
        const existing = await redis.get(redisKey);
        if (existing) {
          const parsed = JSON.parse(existing);
          if (parsed.status === "PROCESSING") {
            return res.status(409).json({
              success: false,
              message: "A request with this Idempotency-Key is already being processed",
            });
          }
          return res.status(parsed.status).json(parsed.body);
        }
      }

      // Intercept res.json to replace the PROCESSING marker with the real completed response.
      const originalJson = res.json;
      res.json = function (body: any): Response {
        const status = res.statusCode;
        const responseData = { status, body };

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

/**
 * Enforces that an Idempotency-Key header is present, rejecting with 400 if it's missing.
 * Apply this on financial/auth-critical routes (payment order creation, OTP verify) in
 * addition to `idempotencyMiddleware()`, which does the actual caching but treats a missing
 * key as optional everywhere by default.
 */
export const requireIdempotencyKey = () => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = req.headers["idempotency-key"];
    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Idempotency-Key header is required for this request",
      });
    }
    next();
  };
};
