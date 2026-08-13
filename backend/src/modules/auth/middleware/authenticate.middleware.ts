import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/TokenService.js';
import { CacheService } from '../../../infrastructure/cache/CacheService.js';
import { redis } from '../../../shared/config/redis.js';
import { AuthenticationException } from '../../../core/exceptions/index.js';

const tokenService = new TokenService(new CacheService(redis));

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

    (req as any).user = {
      id: payload.userId,
      role: payload.role,
    };

    next();
  } catch (err) {
    next(err); // Pass error to global handler
  }
};
