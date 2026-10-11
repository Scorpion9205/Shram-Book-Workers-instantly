import type { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/TokenService.js';
import { CacheService } from '../../../infrastructure/cache/CacheService.js';
import { redis } from '../../../shared/config/redis.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';
import { AuthenticationException } from '../../../core/exceptions/index.js';

const cacheService = new CacheService(redis);
const tokenService = new TokenService(cacheService);

/**
 * Middleware to verify JWT access tokens and populate req.user.
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationException('Access token required', 'TOKEN_REQUIRED');
    }

    const token = authHeader.substring(7);
    const payload = tokenService.verifyAccessToken(token);

    // A valid JWT signature alone isn't enough — a suspended/deleted account's already-issued
    // access token would otherwise keep working until its own expiry (up to 15 minutes) since
    // nothing else re-checks the DB per request. AdminService.suspendUser/UserService.deleteAccount
    // set this marker; its own TTL means it naturally disappears once the token would've expired
    // anyway, so this is a 2-3ms cache hit, not a per-request DB read.
    const isRevoked = await cacheService.get(CacheKeys.revokedUser(payload.userId));
    if (isRevoked) {
      throw new AuthenticationException('Account access has been revoked', 'ACCOUNT_REVOKED');
    }

    (req as any).user = {
      id: payload.userId,
      userId: payload.userId,
      role: payload.role,
    };

    next();
  } catch (err) {
    next(err); // Pass error to global handler
  }
};
