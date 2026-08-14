import { Router } from 'express';
import type { ReviewController } from '../controllers/ReviewController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

export function createReviewRouter(controller: ReviewController): Router {
  const router = Router();

  router.post(
    '/:bookingId',
    authenticate,
    authorize(UserRole.PROVIDER),
    controller.createReview,
  );

  router.get(
    '/worker/:workerId/rating',
    controller.getWorkerRating,
  );

  router.get(
    '/worker/:workerId',
    controller.getWorkerReviews,
  );

  router.get(
    '/provider/:providerId',
    controller.getProviderReviews,
  );

  return router;
}