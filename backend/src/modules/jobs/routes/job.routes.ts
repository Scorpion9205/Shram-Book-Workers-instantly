import { Router } from 'express';
import type { JobController } from '../controllers/JobController.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/role.middleware.js';
import { UserRole } from '../../../core/enums/Role.js';

export function createJobRouter(controller: JobController): Router {
  const router = Router();

  router.post(
    '/create-job',
    authenticate,
    authorize(UserRole.PROVIDER),
    controller.createJob,
  );

  router.get(
    '/',
    authenticate,
    authorize(UserRole.WORKER),
    controller.getAllJobs,
  );

  router.get(
    '/my-applications',
    authenticate,
    authorize(UserRole.WORKER),
    controller.getMyApplications,
  );

  router.get(
    '/provider/my-jobs',
    authenticate,
    authorize(UserRole.PROVIDER),
    controller.getProviderJobs,
  );

  router.get(
    '/:jobId',
    authenticate,
    controller.getJobById,
  );

  router.post(
    '/:jobId/apply',
    authenticate,
    authorize(UserRole.WORKER, UserRole.AGENT),
    controller.applyForJob,
  );

  router.get(
    '/:jobId/applications',
    authenticate,
    authorize(UserRole.PROVIDER),
    controller.getJobApplications,
  );

  router.patch(
    '/applications/:applicationId/accept',
    authenticate,
    authorize(UserRole.PROVIDER),
    controller.acceptApplication,
  );

  router.patch(
    '/applications/:applicationId/reject',
    authenticate,
    authorize(UserRole.PROVIDER),
    controller.rejectApplication,
  );

  return router;
}