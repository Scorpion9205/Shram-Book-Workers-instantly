import {Router} from "express"
import { UserController } from "../controllers/user.controller.js"
import { authMiddleware } from "../../../shared/middleware/auth.middleware.js"

const router = Router();

router.get("/me",authMiddleware,UserController.getProfile)
router.patch("/me",authMiddleware,UserController.updateProfile)
router.delete("/me",authMiddleware,UserController.deleteAccount);
router.patch("/change-password",authMiddleware,UserController.changePassword);
export default router