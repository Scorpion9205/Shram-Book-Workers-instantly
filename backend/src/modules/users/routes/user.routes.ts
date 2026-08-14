import { Router } from 'express';
import type { UserController } from '../controllers/UserController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';

export function createUserRouter(controller: UserController): Router {
  const router = Router();

  router.get('/me', authenticate, controller.getProfile);
  router.patch('/me', authenticate, controller.updateProfile);
  router.delete('/me', authenticate, controller.deleteAccount);
  router.patch('/change-password', authenticate, controller.changePassword);

  return router;
}