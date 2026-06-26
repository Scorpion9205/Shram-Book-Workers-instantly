import { Router } from "express";

import { DashboardController } from "../controllers/dashboard.controller.js";

import { authMiddleware } from "../../../shared/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../shared/middleware/role.middleware.js";

const router = Router();

router.get(
  "/worker",
  authMiddleware,
  roleMiddleware("WORKER"),
  DashboardController.getWorkerDashboard
);

router.get(
  "/provider",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  DashboardController.getProviderDashboard
);

export default router;