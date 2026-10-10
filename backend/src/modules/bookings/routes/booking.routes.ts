import { Router } from 'express';
import type { BookingController } from '../controllers/BookingController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { rateLimiter } from '../../../shared/middleware/rateLimiter.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

export function createBookingRouter(controller: BookingController): Router {
  const router = Router();

  // Secure all booking endpoints with JWT authentication
  router.use(authenticate);

  router.get('/provider', controller.getBookings);
  router.get('/worker', controller.getBookings);
  router.get('/', controller.getBookings);
  router.get('/:id', controller.getBookingById);
  router.post('/', authorize(UserRole.PROVIDER), rateLimiter('booking:create', 20, 10 * 60), controller.createBooking);
  router.patch('/:id/cancel', controller.cancelBooking);
  
  // Work-start & Completion flows
  router.patch('/:id/worker-en-route', controller.workerEnRoute);
  router.post('/:id/verify-start-otp', controller.verifyStartOtp);
  router.patch('/:id/complete', controller.completeBooking);
  router.patch('/:id/settle', controller.settleBooking);
  router.patch('/:id/settle-offline', controller.settleOfflineBooking);
  router.post('/:id/review', controller.submitReview);

  return router;
}
