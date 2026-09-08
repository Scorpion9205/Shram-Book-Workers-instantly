import { Router } from 'express';
import multer from 'multer';
import type { UserController } from '../controllers/UserController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export function createUserRouter(controller: UserController): Router {
  const router = Router();

  router.get('/me', authenticate, controller.getProfile);
  router.patch('/me', authenticate, controller.updateProfile);
  router.delete('/me', authenticate, controller.deleteAccount);
  router.patch('/change-password', authenticate, controller.changePassword);
  router.post('/upload-profile-image', authenticate, upload.single('profileImage'), controller.uploadProfileImage);
  router.delete('/profile-image', authenticate, controller.deleteProfileImage);

  return router;
}