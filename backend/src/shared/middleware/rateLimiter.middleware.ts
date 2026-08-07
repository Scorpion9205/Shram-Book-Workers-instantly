import type{ Response, NextFunction } from "express";
import { redis } from "../config/redis.js";
import type{ AuthRequest } from "./auth.middleware.js";

export const rateLimiter = (
  prefix: string,
  maxRequests: number,
  windowSeconds: number
) => {

  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {

    try {

      let identifier: string;

      // Authenticated APIs
      if (req.user?.userId) {

        identifier =
          req.user.userId;

      } else {

        
        const body =
          (req.body || {}) as {
            identifier?: string;
            phone?: string;
            email?: string;
          };

        const loginIdentifier =
          body.identifier ||
          body.phone ||
          body.email ||
          "anonymous";

        identifier =
          `${req.ip}:${loginIdentifier}`;

      }

      const key =
        `rate:${prefix}:${identifier}`;

      const requests =
        await redis.incr(key);

      if (requests === 1) {

        await redis.expire(
          key,
          windowSeconds
        );

      }

      if (requests > maxRequests) {

        const retryAfter =
          await redis.ttl(key);

        return res.status(429).json({

          success: false,

          message:
            "Too many requests. Please try again later.",

          retryAfter,

        });

      }

      res.setHeader(
        "X-RateLimit-Limit",
        maxRequests.toString()
      );

      res.setHeader(
        "X-RateLimit-Remaining",
        Math.max(
          0,
          maxRequests - requests
        ).toString()
      );

      next();

    } catch (error) {

      console.error(
        "Rate Limiter Error:",
        error
      );

      next();

    }

  };


};
