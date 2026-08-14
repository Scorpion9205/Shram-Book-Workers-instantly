import jwt from 'jsonwebtoken';
import type { ITokenService, ITokenPayload } from '../interfaces/ITokenService.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { UserRole } from '../../../core/enums/Role.js';
import { env } from '../../../config/env.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';
import { AuthenticationException } from '../../../core/exceptions/index.js';

export class TokenService implements ITokenService {
  constructor(private readonly cache: ICacheService) {}

  generateAccessToken(userId: string, role: UserRole): string {
    return jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY as any,
    });
  }

  generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY as any,
    });
  }

  async storeRefreshToken(userId: string, token: string): Promise<void> {
    const key = CacheKeys.refreshToken(userId);
    // Refresh token expiry parsed or default to 7 days in seconds (604800)
    await this.cache.set(key, token, 7 * 24 * 60 * 60);
  }

  async verifyRefreshToken(userId: string, token: string): Promise<boolean> {
    const key = CacheKeys.refreshToken(userId);
    const storedToken = await this.cache.get<string>(key);
    return storedToken === token;
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    const key = CacheKeys.refreshToken(userId);
    await this.cache.del(key);
  }

  verifyAccessToken(token: string): ITokenPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as ITokenPayload;
    } catch (e: any) {
      if (e.name === 'TokenExpiredError') {
        throw new AuthenticationException('Access token expired', 'TOKEN_EXPIRED');
      }
      throw new AuthenticationException('Invalid access token', 'INVALID_TOKEN');
    }
  }
}
