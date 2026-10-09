import { Router } from 'express';
import multer from 'multer';
import type { UserController } from '../controllers/UserController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { BadRequestException } from '../../../core/exceptions/index.js';

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(new BadRequestException('Only JPEG, PNG, or WEBP images are allowed'));
      return;
    }
    cb(null, true);
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