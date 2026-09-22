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
    const userRole = (user?.role || '').toUpperCase() as UserRole;
    if (!user || !roles.includes(userRole)) {
      throw new AuthorizationException('Access denied. Insufficient permissions.');
    }
    next();
  };
};
