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

// Resolve dependencies manually to maintain compatibility with existing route imports in app.ts
const prisma = PrismaService.getInstance();
const cache = (global as any).deps?.cache || new CacheService(redis);
const userRepo = new AuthRepository(prisma);
const otpRepo = new OTPRepository(prisma);

// Simple providers for Phase 3 stubbing (replaced fully in Phase 8)
const emailProvider = {
  send: async (to: string, subject: string, body: string) => {
    console.log(`[Email Mock] To: ${to} | Subject: ${subject} | Body: ${body}`);
  },
  sendBatch: async (messages: any) => {
    console.log(`[Email Mock] Batch send requested`, messages);
  },
};

const smsProvider = {
  send: async (to: string, body: string) => {
    console.log(`[SMS Mock] To: ${to} | Body: ${body}`);
  },
};

const otpService = new OTPService(otpRepo, cache, emailProvider, smsProvider);
const tokenService = new TokenService(cache);
const authService = new AuthService(userRepo, otpService, tokenService, cache, prisma);
const controller = new AuthController(authService, cache);

const router = Router();

// OTP Authentication (Provider/Worker)
router.post('/signup', controller.requestOTP);
router.post('/login', controller.verifyOTP);
router.post('/send-otp', controller.requestOTP);
router.post('/verify-otp', controller.verifyOTP);

// Google OAuth
router.post('/google', controller.googleAuth);

// Admin/Agent Hashed Password Authentication
router.post('/admin/login', controller.adminLogin);

// Token Management
router.post('/refresh-token', controller.refreshToken);
router.post('/logout', authenticate, controller.logout);

// Password Management (Admin/Agent)
router.patch('/change-password', authenticate, authorize(UserRole.ADMIN, UserRole.AGENT), controller.changePassword);

export default router;