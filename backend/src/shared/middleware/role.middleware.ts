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

        const userRole = (req.user.role || '').toUpperCase() as UserRole;
        if(!allowedRoles.includes(userRole)){
            return res.status(403).json({
                success:false,
                message:"Forbidden",
            })
        }
        next();
    }

}