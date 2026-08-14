import { Router } from 'express';
import { ProviderController } from '../controllers/ProviderController.js';
import { ProviderService } from '../services/ProviderService.js';
import { ProviderRepository } from '../repositories/ProviderRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

// Dependency wiring fallback
const prisma = PrismaService.getInstance();

const providerRepo = new ProviderRepository(prisma);
const providerService = new ProviderService(providerRepo);
const controller = new ProviderController(providerService);

const router = Router();

router.post(
  '/profile',
  authenticate,
  authorize(UserRole.PROVIDER),
  controller.createProfile,
);

router.get(
  '/me',
  authenticate,
  authorize(UserRole.PROVIDER),
  controller.getMyProfile,
);

router.patch(
  '/me',
  authenticate,
  authorize(UserRole.PROVIDER),
  controller.updateProfile,
);

export default router;