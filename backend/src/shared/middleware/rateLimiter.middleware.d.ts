import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";
export declare const rateLimiter: (prefix: string, maxRequests: number, windowSeconds: number) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=rateLimiter.middleware.d.ts.map