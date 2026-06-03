import {Router} from "express"
import { AuthController } from "../controllers/auth.controller.js"
import { authMiddleware, type AuthRequest } from "../../../shared/middleware/auth.middleware.js"
import { roleMiddleware } from "../../../shared/middleware/role.middleware.js"
import { UserRole } from "@prisma/client"

const router = Router()
router.post("/signup",AuthController.signup)
router.post("/login",AuthController.login)

// Test route for auth middleware 

router.get("/me",authMiddleware,(req:AuthRequest,res)=>{
    return res.json({
        success:true,
        user:req.user
    })
})
 
// Test route for role middleware 
router.get("/worker-only",authMiddleware,roleMiddleware(UserRole.WORKER),(req,res)=>{
    return res.status(200).json({
        success:true,
        message:"Welcome Worker"
    })
})
export default router