import { Router } from 'express';
import type { PaymentController } from '../controllers/PaymentController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';
import { requireIdempotencyKey } from '../../../shared/middleware/idempotency.middleware.js';

export function createPaymentRouter(controller: PaymentController): Router {
  const router = Router();

  router.post(
    '/orders',
    authenticate,
    authorize(UserRole.PROVIDER),
    requireIdempotencyKey(),
    controller.createOrder,
  );

  router.post(
    '/webhook',
    controller.handleWebhook,
  );

  return router;
}
