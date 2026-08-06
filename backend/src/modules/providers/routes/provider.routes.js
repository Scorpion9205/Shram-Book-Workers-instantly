import { Router } from "express";
import { ProviderController } from "../controllers/provider.controller.js";
import { authMiddleware } from "../../../shared/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../shared/middleware/role.middleware.js";
const router = Router();
router.post("/profile", authMiddleware, roleMiddleware("PROVIDER"), ProviderController.createProfile);
router.get("/me", authMiddleware, roleMiddleware("PROVIDER"), ProviderController.getMyProfile);
router.patch("/me", authMiddleware, roleMiddleware("PROVIDER"), ProviderController.updateProfile);
export default router;
//# sourceMappingURL=provider.routes.js.map