import { Router } from "express";

import { AgentController } from "../controllers/agent.controller.js";

import { authMiddleware } from "../../../shared/middleware/auth.middleware.js";

import { roleMiddleware } from "../../../shared/middleware/role.middleware.js";

const router = Router();

router.post(
  "/profile",
  authMiddleware,
  roleMiddleware("AGENT"),
  AgentController.createProfile
);

router.get(
  "/me",
  authMiddleware,
  roleMiddleware("AGENT"),
  AgentController.getMyProfile
);

router.patch(
  "/me",
  authMiddleware,
  roleMiddleware("AGENT"),
  AgentController.updateProfile
);

router.get(
    "/dashboard",
    authMiddleware,
    roleMiddleware("AGENT"),
    AgentController.getDashboard
);
router.get(
  "/applications",
  authMiddleware,
  roleMiddleware("AGENT"),
  AgentController.getMyApplications
);

router.get(
  "/bookings",
  authMiddleware,
  roleMiddleware("AGENT"),
  AgentController.getMyBookings
);
export default router;
