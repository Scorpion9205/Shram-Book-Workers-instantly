import { Router } from 'express';
import type { NotificationController } from '../controllers/NotificationController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';

export function createNotificationRouter(controller: NotificationController): Router {
  const router = Router();

  router.get(
    '/',
    authenticate,
    controller.getMyNotifications,
  );

  router.patch(
    '/:notificationId/read',
    authenticate,
    controller.markAsRead,
  );

  return router;
}
