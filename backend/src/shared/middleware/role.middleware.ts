import type { Response,NextFunction } from "express";
import  type { AuthRequest } from "./auth.middleware.js";

import { UserRole } from "@prisma/client";

export const roleMiddleware = (...allowedRoles:UserRole[])=>{
    return (req:AuthRequest,res:Response,next:NextFunction) =>{
        if(!req.user){
            return res.status(401).json({
                success:false,
                message:"Unauthorized"
            })
        }

        if(!allowedRoles.includes(req.user.role as UserRole)){
            return res.status(403).json({
                success:false,
                message:"Forbidden",
            })
        }
        next();
    }

}