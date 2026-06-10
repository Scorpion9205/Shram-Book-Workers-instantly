import {Router} from "express";
import { InstantRequestController } from "../controllers/instant-request.controller.js";
import { authMiddleware } from "../../../shared/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../shared/middleware/role.middleware.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  InstantRequestController.createInstantRequest
);

router.get(
  "/nearby",
  authMiddleware,
  roleMiddleware("WORKER"),
  InstantRequestController.getNearbyRequests
);

router.post(
  "/calculate-fare",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  InstantRequestController.calculateFare
);

router.post(
  "/items/:itemId/accept",
  authMiddleware,
  roleMiddleware("WORKER"),
  InstantRequestController.acceptRequest
);

router.get(
  "/my-requests",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  InstantRequestController.getMyRequests
);

export default router;