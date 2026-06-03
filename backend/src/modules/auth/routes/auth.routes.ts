import {Router} from "express"
import { AuthController } from "../controllers/auth.controller.js"
import { authMiddleware, type AuthRequest } from "../../../shared/middleware/auth.middleware.js"
const router = Router()
router.post("/signup",AuthController.signup)
router.post("/login",AuthController.login)
router.get("/me",authMiddleware,(req:AuthRequest,res)=>{
    return res.json({
        success:true,
        user:req.user
    })
})
export default router