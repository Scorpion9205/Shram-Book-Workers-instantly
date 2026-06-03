import type { Request, Response } from "express"
import { AuthService } from "../services/auth.service.js"
import { signupSchema ,loginSchema } from "../validations/auth.validation.js"
import { success } from "zod"




export class AuthController{
    static async signup(req:Request,res:Response){
        try {
            const validationResult = signupSchema.safeParse(req.body)

            if(!validationResult.success){
                return res.status(400).json({
                    success:false,
                    errors:
                    validationResult.error.issues
                })


            }

            const result = await AuthService.signup(validationResult.data)

            res.cookie("refreshToken",result.refreshToken,{
                httpOnly:true,
                secure:false,
                sameSite:"lax",
                maxAge:7*24*60*60*1000
            })

            return res.status(201).json({
                success:true,
                message:"User registered successfully",
                user:result.user
            })
        } catch (error:any) {
            
            return res.status(400).json({
                success:false,
                message:error.message,
            })
            
        }
    }

    static async login(req:Request,res:Response){
        try {
            const validationResult = loginSchema.safeParse(req.body)

            if(!validationResult.success){
                return res.status(400).json({
                    success:false,
                    errors:validationResult.error.issues
                })
            }

            const result = await AuthService.login(validationResult.data);
            res.cookie("refreshToken",result.refreshToken),{
                httpOnly:true,
                secure:false,
                samesite:"lax"
            }

            return res.status(200).json({
                success:true,
                message:"Login successful",
                user:result.user,
                accessToken: result.accessToken,
            })
        } catch (error:any) {
            return res.status(400).json({
                success:false,
                message:error.message,
            })
            
        }
    }
}