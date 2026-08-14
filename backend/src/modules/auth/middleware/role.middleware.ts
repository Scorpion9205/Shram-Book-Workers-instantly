import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../../core/enums/Role.js';
import { AuthorizationException } from '../../../core/exceptions/index.js';

/**
 * Middleware to authorize user roles.
 * Usage: router.post('/admin', authenticate, authorize(UserRole.ADMIN), ctrl)
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      throw new AuthorizationException('Access denied. Insufficient permissions.');
    }
    next();
  };
};
