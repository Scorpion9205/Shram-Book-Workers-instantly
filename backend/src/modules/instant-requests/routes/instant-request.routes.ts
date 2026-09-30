import { Router } from "express";
import type { InstantRequestController } from "../controllers/instant-request.controller.js";
import { authenticate } from "../../auth/middleware/authenticate.middleware.js";
import { authorize } from "../../auth/middleware/role.middleware.js";
import { rateLimiter } from "../../../shared/middleware/rateLimiter.middleware.js";
import { UserRole } from "../../../core/enums/Role.js";

export function createInstantRequestRouter(controller: InstantRequestController): Router {
  const router = Router();

  router.post(
    "/",
    authenticate,
    authorize(UserRole.PROVIDER),
    rateLimiter("instant:create", 15, 60),
    controller.createInstantRequest,
  );

  router.get("/nearby", authenticate, authorize(UserRole.WORKER), controller.getNearbyRequests);

  router.post("/calculate-fare", authenticate, authorize(UserRole.PROVIDER), controller.calculateFare);

  router.post("/items/:itemId/accept", authenticate, authorize(UserRole.WORKER), controller.acceptRequest);

  router.get("/my-requests", authenticate, authorize(UserRole.PROVIDER), controller.getMyRequests);

  router.post("/:id/bids", authenticate, authorize(UserRole.WORKER), controller.submitBid);

  router.post("/:id/bids/:bidId/select", authenticate, authorize(UserRole.PROVIDER), controller.selectBid);

  return router;
}
