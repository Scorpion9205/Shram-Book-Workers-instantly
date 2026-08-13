import { Router } from 'express';
import { WorkerController } from '../controllers/WorkerController.js';
import { WorkerService } from '../services/WorkerService.js';
import { WorkerRepository } from '../repositories/WorkerRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { CacheService } from '../../../infrastructure/cache/CacheService.js';
import { redis } from '../../../shared/config/redis.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

// Dependency wiring fallback
const prisma = PrismaService.getInstance();
const cache = (global as any).deps?.cache || new CacheService(redis);

const workerRepo = new WorkerRepository(prisma);
const workerService = new WorkerService(workerRepo, cache);
const controller = new WorkerController(workerService);

const router = Router();

router.post(
  '/profile',
  authenticate,
  authorize(UserRole.WORKER),
  controller.createProfile,
);

router.get(
  '/me',
  authenticate,
  authorize(UserRole.WORKER),
  controller.getMyProfile,
);

router.patch(
  '/me',
  authenticate,
  authorize(UserRole.WORKER),
  controller.updateProfile,
);

router.patch(
  '/availability',
  authenticate,
  authorize(UserRole.WORKER),
  controller.updateAvailability,
);

export default router;