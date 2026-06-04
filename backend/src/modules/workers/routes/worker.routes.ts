import { Router } from "express";

import { authMiddleware } from "../../../shared/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../shared/middleware/role.middleware.js";

import { WorkerController } from "../controllers/worker.controller.js";

const router = Router();

router.post(
  "/profile",
  authMiddleware,
  roleMiddleware("WORKER"),
  WorkerController.createProfile
);

router.get(
  "/me",
  authMiddleware,
  roleMiddleware("WORKER"),
  WorkerController.getMyProfile
);

router.patch(
  "/me",
  authMiddleware,
  roleMiddleware("WORKER"),
  WorkerController.updateProfile
);

router.patch(
  "/availability",
  authMiddleware,
  roleMiddleware("WORKER"),
  WorkerController.updateAvailability
);


export default router;