import { Router } from 'express';
import type { AdminController } from '../controllers/AdminController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

export function createAdminRouter(controller: AdminController): Router {
  const router = Router();

  router.get(
    '/dashboard',
    authenticate,
    authorize(UserRole.ADMIN),
    controller.getDashboard,
  );

  router.post(
    '/settings',
    authenticate,
    authorize(UserRole.ADMIN),
    controller.updateSetting,
  );

  return router;
}
