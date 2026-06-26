import { Router } from "express";
import { JobController } from "../controllers/job.controller.js";
import { authMiddleware } from "../../../shared/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../shared/middleware/role.middleware.js";
const router = Router();

router.post("/",authMiddleware,roleMiddleware("PROVIDER"),JobController.createJob)

router.get(
  "/",
  authMiddleware,
  roleMiddleware("WORKER"),
  JobController.getAllJobs
);

router.get(
  "/my-applications",
  authMiddleware,
  roleMiddleware("WORKER"),
  JobController.getMyApplications
);
router.get(
  "/:jobId",
  authMiddleware,
  JobController.getJobById
);

router.post(
  "/:jobId/apply",
  authMiddleware,
  roleMiddleware("WORKER"),
  JobController.applyForJob
);

router.get(
  "/:jobId/applications",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  JobController.getJobApplications
);

router.patch(
  "/applications/:applicationId/accept",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  JobController.acceptApplication
);

router.get(
  "/provider/my-jobs",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  JobController.getProviderJobs
);

export default router;