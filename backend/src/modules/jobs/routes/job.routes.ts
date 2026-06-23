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

export default router;