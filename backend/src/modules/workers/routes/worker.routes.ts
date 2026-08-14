import { Router } from 'express';
import type { WorkerController } from '../controllers/WorkerController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

export function createWorkerRouter(controller: WorkerController): Router {
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

  return router;
}