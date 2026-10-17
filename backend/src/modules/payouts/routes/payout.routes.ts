import { Router } from 'express';
import type { PayoutController } from '../controllers/PayoutController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

export function createPayoutRouter(controller: PayoutController): Router {
  const router = Router();
  router.use(authenticate);

  // Worker: withdraw wallet balance
  router.post('/worker-withdrawal', authorize(UserRole.WORKER), controller.requestWorkerWithdrawal);

  // Agent: own commission and the workers' lump sum are claimed separately
  router.get('/agent/summary', authorize(UserRole.AGENT), controller.getAgentSummary);
  router.post('/agent/commission', authorize(UserRole.AGENT), controller.requestAgentCommission);
  router.post('/agent/worker-funds', authorize(UserRole.AGENT), controller.requestAgentWorkerFunds);

  // Worker / agent: their own request history
  router.get('/mine', authorize(UserRole.WORKER, UserRole.AGENT), controller.listMine);

  // Admin: the queue
  router.get('/admin', authorize(UserRole.ADMIN), controller.list);
  router.get('/admin/summary', authorize(UserRole.ADMIN), controller.getPlatformSummary);
  router.post('/admin/:id/pay', authorize(UserRole.ADMIN), controller.markPaid);
  router.post('/admin/:id/reject', authorize(UserRole.ADMIN), controller.reject);

  return router;
}
