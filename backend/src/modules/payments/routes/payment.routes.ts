import { Router } from 'express';
import type { PaymentController } from '../controllers/PaymentController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';
import { requireIdempotencyKey } from '../../../shared/middleware/idempotency.middleware.js';

export function createPaymentRouter(controller: PaymentController): Router {
  const router = Router();

  /**
   * @openapi
   * /payments/orders:
   *   post:
   *     tags: [Payments]
   *     summary: Create a Razorpay order for a CREATED booking (Provider only)
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [bookingId]
   *             properties:
   *               bookingId: { type: string }
   *     responses:
   *       201: { description: Razorpay order created, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   *       400: { description: Booking not in CREATED status, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
   */
  router.post(
    '/orders',
    authenticate,
    authorize(UserRole.PROVIDER),
    requireIdempotencyKey(),
    controller.createOrder,
  );

  /**
   * @openapi
   * /payments/webhook:
   *   post:
   *     tags: [Payments]
   *     summary: Razorpay webhook callback (payment.captured / order.paid). Signature-verified against the raw request body; never called directly by clients.
   *     security: []
   *     parameters:
   *       - in: header
   *         name: X-Razorpay-Signature
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Webhook processed, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   *       400: { description: Invalid webhook signature, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
   */
  router.post(
    '/webhook',
    controller.handleWebhook,
  );

  return router;
}
