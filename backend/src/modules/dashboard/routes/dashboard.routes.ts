import { Router } from "express";
import type { DashboardController } from "../controllers/dashboard.controller.js";
import { authenticate } from "../../auth/middleware/authenticate.middleware.js";
import { authorize } from "../../auth/middleware/role.middleware.js";
import { UserRole } from "../../../core/enums/Role.js";

export function createDashboardRouter(controller: DashboardController): Router {
  const router = Router();

  router.get("/worker", authenticate, authorize(UserRole.WORKER), controller.getWorkerDashboard);
  router.get("/provider", authenticate, authorize(UserRole.PROVIDER), controller.getProviderDashboard);

  return router;
}
