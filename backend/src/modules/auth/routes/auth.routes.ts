import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { AuthService } from '../services/AuthService.js';
import { AuthRepository } from '../repositories/AuthRepository.js';
import { OTPRepository } from '../repositories/OTPRepository.js';
import { OTPService } from '../services/OTPService.js';
import { TokenService } from '../services/TokenService.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { CacheService } from '../../../infrastructure/cache/CacheService.js';
import { redis } from '../../../shared/config/redis.js';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';
import { rateLimiter } from '../../../shared/middleware/rateLimiter.middleware.js';
import { requireIdempotencyKey } from '../../../shared/middleware/idempotency.middleware.js';

import { ResendProvider } from '../../../infrastructure/providers/email/ResendProvider.js';
import { ExotelProvider } from '../../../infrastructure/providers/sms/ExotelProvider.js';
import { env } from '../../../config/env.js';

// Resolve dependencies manually to maintain compatibility with existing route imports in app.ts
const prisma = PrismaService.getInstance();
const cache = (global as any).deps?.cache || new CacheService(redis);
const userRepo = new AuthRepository(prisma);
const otpRepo = new OTPRepository(prisma);

const emailProvider = new ResendProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
const smsProvider = new ExotelProvider(env.EXOTEL_API_KEY, env.EXOTEL_API_TOKEN, env.EXOTEL_SID, env.EXOTEL_FROM);

const otpService = new OTPService(otpRepo, cache, emailProvider, smsProvider);
const tokenService = new TokenService(cache);
const authService = new AuthService(userRepo, otpService, tokenService, cache, prisma, emailProvider, smsProvider);
const controller = new AuthController(authService, cache);

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

export default router;