import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth.middleware.js";
import { LocationController } from "../controllers/location.controller.js";
const router = Router();
router.post("/update", authMiddleware, LocationController.updateLocation);
router.get("/me", authMiddleware, LocationController.getMyLocation);
export default router;
//# sourceMappingURL=location.routes.js.map