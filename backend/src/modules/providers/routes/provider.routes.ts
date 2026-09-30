import { Router } from 'express';
import type { ProviderController } from '../controllers/ProviderController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

export function createProviderRouter(controller: ProviderController): Router {
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

  return router;
}