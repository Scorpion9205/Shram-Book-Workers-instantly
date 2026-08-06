import { redis } from "../config/redis.js";
export const rateLimiter = (prefix, maxRequests, windowSeconds) => {
    return async (req, res, next) => {
        try {
            let identifier;
            // Authenticated APIs
            if (req.user?.userId) {
                identifier =
                    req.user.userId;
            }
            else {
                const body = req.body;
                const loginIdentifier = body.identifier ||
                    body.phone ||
                    body.email ||
                    "anonymous";
                identifier =
                    `${req.ip}:${loginIdentifier}`;
            }
            const key = `rate:${prefix}:${identifier}`;
            const requests = await redis.incr(key);
            if (requests === 1) {
                await redis.expire(key, windowSeconds);
            }
            if (requests > maxRequests) {
                const retryAfter = await redis.ttl(key);
                return res.status(429).json({
                    success: false,
                    message: "Too many requests. Please try again later.",
                    retryAfter,
                });
            }
            res.setHeader("X-RateLimit-Limit", maxRequests.toString());
            res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - requests).toString());
            next();
        }
        catch (error) {
            console.error("Rate Limiter Error:", error);
            next();
        }
    };
};
//# sourceMappingURL=rateLimiter.middleware.js.map