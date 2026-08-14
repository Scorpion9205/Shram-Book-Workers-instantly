import { Router } from 'express';
import type { AdminController } from '../controllers/AdminController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

export function createAdminRouter(controller: AdminController): Router {
  const router = Router();

  // Protect all administration routes with JWT authentication and ADMIN role guard
  router.use(authenticate);
  router.use(authorize(UserRole.ADMIN));

  // Dashboard Overview
  router.get('/dashboard', controller.getDashboard);
  router.get('/analytics/dashboard', controller.getDashboard);

  // User Management
  router.get('/users', controller.getUsers);
  router.put('/users/:id/suspend', controller.suspendUser);

  // Worker Verification
  router.put('/workers/:id/verify', controller.verifyWorker);

  // Booking Oversight & Assignment
  router.get('/bookings', controller.getBookings);
  router.post('/bookings/:id/assign-worker', controller.assignWorker);

  // Platform Settings Management
  router.get('/settings', controller.getAllSettings);
  router.put('/settings/:key', controller.updateSetting);

  // Notification Templates Administration
  router.get('/notification-templates', controller.getNotificationTemplates);
  router.put('/notification-templates/:type/:channel/:locale', controller.updateNotificationTemplate);

  return router;
}
