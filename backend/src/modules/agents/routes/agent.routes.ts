import { Router } from 'express';
import type { AgentController } from '../controllers/AgentController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

export function createAgentRouter(controller: AgentController): Router {
  const router = Router();

  router.post(
    '/profile',
    authenticate,
    authorize(UserRole.AGENT),
    controller.createProfile,
  );

  router.get(
    '/me',
    authenticate,
    authorize(UserRole.AGENT),
    controller.getMyProfile,
  );

  router.patch(
    '/me',
    authenticate,
    authorize(UserRole.AGENT),
    controller.updateProfile,
  );

  router.get(
    '/dashboard',
    authenticate,
    authorize(UserRole.AGENT),
    controller.getDashboard,
  );

  router.get(
    '/applications',
    authenticate,
    authorize(UserRole.AGENT),
    controller.getMyApplications,
  );

  router.get(
    '/bookings',
    authenticate,
    authorize(UserRole.AGENT),
    controller.getMyBookings,
  );

  return router;
}
