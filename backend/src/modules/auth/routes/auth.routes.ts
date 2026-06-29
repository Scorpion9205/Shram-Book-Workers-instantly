import {Router} from "express"
import { AuthController } from "../controllers/auth.controller.js"
import { authMiddleware, type AuthRequest } from "../../../shared/middleware/auth.middleware.js"
import { roleMiddleware } from "../../../shared/middleware/role.middleware.js"
import { UserRole } from "@prisma/client"
import { rateLimiter } from "../../../shared/middleware/rateLimiter.middleware.js"


const router = Router()
router.post("/signup",rateLimiter(
    "signup",
    3,
    15 * 60
  ),AuthController.signup)
router.post("/login", rateLimiter(
    "login",
    5,
    15 * 60
  ),AuthController.login)



router.get("/authmid",authMiddleware,(req:AuthRequest,res)=>{
    return res.json({
        success:true,
        user:req.user
    })
})
 

router.get("/worker-only",authMiddleware,roleMiddleware(UserRole.WORKER),(req,res)=>{
    return res.status(200).json({
        success:true,
        message:"Welcome Worker"
    })
})

router.post(
  "/refresh-token",
  rateLimiter(
    "signup",
    3,
    15 * 60
  ),
  AuthController.refreshToken
);

router.post(
  "/logout",
  authMiddleware,
  AuthController.logout
);
router.post(
  "/forgot-password",
  AuthController.forgotPassword
);

router.post(
  "/reset-password",
  AuthController.resetPassword
);
export default router