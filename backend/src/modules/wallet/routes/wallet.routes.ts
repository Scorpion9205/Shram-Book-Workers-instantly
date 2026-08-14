import { Router } from 'express';
import type { WalletController } from '../controllers/WalletController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

export function createWalletRouter(controller: WalletController): Router {
  const router = Router();

  router.get(
    '/balance',
    authenticate,
    authorize(UserRole.WORKER),
    controller.getBalance,
  );

  router.get(
    '/transactions',
    authenticate,
    authorize(UserRole.WORKER),
    controller.getTransactionHistory,
  );

  return router;
}
