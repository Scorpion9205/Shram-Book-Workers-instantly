import { Router } from 'express';
import type { AuthController } from '../controllers/AuthController.js';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';
import { rateLimiter } from '../../../shared/middleware/rateLimiter.middleware.js';
import { requireIdempotencyKey } from '../../../shared/middleware/idempotency.middleware.js';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  // OTP Authentication (Provider/Worker)
  router.post('/signup', controller.signup);
  router.post('/login', requireIdempotencyKey(), controller.verifyOTP);
  router.post('/send-otp', controller.requestOTP);
  router.post('/verify-otp', requireIdempotencyKey(), controller.verifyOTP);

  // Google OAuth
  router.post('/google', controller.googleAuth);

  // Admin/Agent Hashed Password Authentication
  router.post('/admin/login', rateLimiter('admin-login', 10, 15 * 60, true), controller.adminLogin);

  // Token Management
  router.post('/refresh-token', controller.refreshToken);
  router.post('/logout', authenticate, controller.logout);

  // Password Management (Admin/Agent)
  router.patch('/change-password', authenticate, authorize(UserRole.ADMIN, UserRole.AGENT), controller.changePassword);

  return router;
}
