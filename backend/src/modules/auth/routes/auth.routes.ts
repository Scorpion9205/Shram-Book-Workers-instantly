import { Router } from 'express';
import type { AuthController } from '../controllers/AuthController.js';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';
import { rateLimiter } from '../../../shared/middleware/rateLimiter.middleware.js';
import { requireIdempotencyKey } from '../../../shared/middleware/idempotency.middleware.js';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  /**
   * @openapi
   * /auth/signup:
   *   post:
   *     tags: [Auth]
   *     summary: Register a new Provider/Worker/Agent and dispatch a signup OTP
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, phone, role]
   *             properties:
   *               name: { type: string }
   *               phone: { type: string }
   *               email: { type: string }
   *               role: { type: string, enum: [PROVIDER, WORKER, AGENT] }
   *     responses:
   *       200: { description: OTP dispatched, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   *       400: { description: Validation failed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
   */
  // OTP Authentication (Provider/Worker)
  router.post('/signup', controller.signup);

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Verify a LOGIN OTP and receive an access/refresh token pair
   *     security: []
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [channel, identifier, code]
   *             properties:
   *               channel: { type: string, enum: [EMAIL, SMS] }
   *               identifier: { type: string }
   *               code: { type: string }
   *     responses:
   *       200: { description: Authenticated, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   *       400: { description: Invalid/expired OTP, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
   */
  router.post('/login', requireIdempotencyKey(), controller.verifyOTP);

  /**
   * @openapi
   * /auth/send-otp:
   *   post:
   *     tags: [Auth]
   *     summary: Request a LOGIN OTP for an existing (or about-to-signup) identifier
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [channel, identifier]
   *             properties:
   *               channel: { type: string, enum: [EMAIL, SMS] }
   *               identifier: { type: string }
   *               role: { type: string, enum: [PROVIDER, WORKER, AGENT] }
   *     responses:
   *       200: { description: OTP dispatched, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   */
  router.post('/send-otp', controller.requestOTP);

  /**
   * @openapi
   * /auth/verify-otp:
   *   post:
   *     tags: [Auth]
   *     summary: Verify an OTP (alias of /login, same handler)
   *     security: []
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [channel, identifier, code]
   *             properties:
   *               channel: { type: string, enum: [EMAIL, SMS] }
   *               identifier: { type: string }
   *               code: { type: string }
   *     responses:
   *       200: { description: Authenticated, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   */
  router.post('/verify-otp', requireIdempotencyKey(), controller.verifyOTP);

  /**
   * @openapi
   * /auth/google:
   *   post:
   *     tags: [Auth]
   *     summary: Sign in or register via a verified Google ID token (no OTP step)
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [idToken, role]
   *             properties:
   *               idToken: { type: string }
   *               role: { type: string, enum: [PROVIDER, WORKER, AGENT] }
   *     responses:
   *       200: { description: Authenticated, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   *       401: { description: Invalid Google ID token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
   */
  // Google OAuth
  router.post('/google', controller.googleAuth);

  /**
   * @openapi
   * /auth/admin/login:
   *   post:
   *     tags: [Auth]
   *     summary: Admin/Agent password login (rate-limited)
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string }
   *               password: { type: string }
   *     responses:
   *       200: { description: Authenticated, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   *       401: { description: Invalid credentials, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
   *       429: { description: Rate limited, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
   */
  // Admin/Agent Hashed Password Authentication
  router.post('/admin/login', rateLimiter('admin-login', 10, 15 * 60, true), controller.adminLogin);

  /**
   * @openapi
   * /auth/refresh-token:
   *   post:
   *     tags: [Auth]
   *     summary: Exchange a valid refresh token (httpOnly cookie) for a new access token
   *     security: []
   *     responses:
   *       200: { description: New access token issued, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   *       401: { description: Refresh token invalid/revoked, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
   */
  // Token Management
  router.post('/refresh-token', controller.refreshToken);

  /**
   * @openapi
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Revoke the current refresh token
   *     responses:
   *       200: { description: Logged out, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   */
  router.post('/logout', authenticate, controller.logout);

  /**
   * @openapi
   * /auth/change-password:
   *   patch:
   *     tags: [Auth]
   *     summary: Change the current Admin/Agent's password
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [currentPassword, newPassword]
   *             properties:
   *               currentPassword: { type: string }
   *               newPassword: { type: string }
   *     responses:
   *       200: { description: Password changed, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   *       403: { description: Not an Admin/Agent, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
   */
  // Password Management (Admin/Agent)
  router.patch('/change-password', authenticate, authorize(UserRole.ADMIN, UserRole.AGENT), controller.changePassword);

  return router;
}
