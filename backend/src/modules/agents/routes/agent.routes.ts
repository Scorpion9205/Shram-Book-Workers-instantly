import { Router } from 'express';
import type { AgentController } from '../controllers/AgentController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

export function createAgentRouter(controller: AgentController): Router {
  const router = Router();

  router.post(
    '/profile',
    authenticate,
    authorize(UserRole.AGENT),
    controller.createProfile,
  );

  router.get(
    '/me',
    authenticate,
    authorize(UserRole.AGENT),
    controller.getMyProfile,
  );

  router.patch(
    '/me',
    authenticate,
    authorize(UserRole.AGENT),
    controller.updateProfile,
  );

  router.get(
    '/dashboard',
    authenticate,
    authorize(UserRole.AGENT),
    controller.getDashboard,
  );

  router.get(
    '/applications',
    authenticate,
    authorize(UserRole.AGENT),
    controller.getMyApplications,
  );

  router.get(
    '/bookings',
    authenticate,
    authorize(UserRole.AGENT),
    controller.getMyBookings,
  );

  router.get(
    '/commissions',
    authenticate,
    authorize(UserRole.AGENT),
    controller.getCommissionSummary,
  );

  // Worker roster — agent-managed workers (phone-less daily-wage laborers the agent onboards
  // and operates on behalf of).
  router.post(
    '/workers',
    authenticate,
    authorize(UserRole.AGENT),
    controller.createWorker,
  );

  router.get(
    '/workers',
    authenticate,
    authorize(UserRole.AGENT),
    controller.listWorkers,
  );

  router.patch(
    '/workers/:workerId/availability',
    authenticate,
    authorize(UserRole.AGENT),
    controller.setWorkerAvailability,
  );

  router.patch(
    '/workers/:workerId/verify',
    authenticate,
    authorize(UserRole.AGENT),
    controller.setWorkerVerified,
  );

  router.delete(
    '/workers/:workerId',
    authenticate,
    authorize(UserRole.AGENT),
    controller.removeWorker,
  );

  router.get(
    '/workers/:workerId/earnings',
    authenticate,
    authorize(UserRole.AGENT),
    controller.getWorkerEarnings,
  );

  router.post(
    '/workers/:workerId/payout',
    authenticate,
    authorize(UserRole.AGENT),
    controller.payoutWorker,
  );

  router.patch(
    '/workers/:workerId/bank-details',
    authenticate,
    authorize(UserRole.AGENT),
    controller.setWorkerBankDetails,
  );

  // Normal-job worker assignment — once a Provider accepts the Agent's application, the Agent
  // picks specific roster workers to actually fill it (one call per worker, up to workerCount).
  router.post(
    '/applications/:applicationId/assign-worker',
    authenticate,
    authorize(UserRole.AGENT),
    controller.assignWorker,
  );

  // Instant Requests — browse open requests matching the roster's skills, and assign a roster
  // worker per item (no real-time push yet, pull/browse only for this phase).
  router.get(
    '/instant-requests/open',
    authenticate,
    authorize(UserRole.AGENT),
    controller.getOpenInstantRequests,
  );

  router.post(
    '/instant-requests/items/:itemId/assign',
    authenticate,
    authorize(UserRole.AGENT),
    controller.assignWorkerToInstantItem,
  );

  // Agent's own commission checkout — separate from worker payouts, minimum-gated (see
  // AgentService.checkoutCommission).
  router.post(
    '/commissions/checkout',
    authenticate,
    authorize(UserRole.AGENT),
    controller.checkoutCommission,
  );

  return router;
}
