import { Router } from "express";
import type { LocationController } from "../controllers/location.controller.js";
import { authenticate } from "../../auth/middleware/authenticate.middleware.js";

export function createLocationRouter(controller: LocationController): Router {
  const router = Router();

  router.post("/update", authenticate, controller.updateLocation);
  router.get("/me", authenticate, controller.getMyLocation);

  return router;
}
