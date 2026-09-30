import { Router } from 'express';
import type { PricingController } from '../controllers/PricingController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';

export function createPricingRouter(controller: PricingController): Router {
  const router = Router();

  // Secure pricing endpoint with JWT check
  router.get('/estimate', authenticate, controller.getEstimate);

  return router;
}
