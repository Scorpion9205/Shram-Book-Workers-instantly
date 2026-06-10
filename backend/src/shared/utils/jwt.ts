import "dotenv/config"
import jwt from "jsonwebtoken"
export const generateAccessToken  =(userId:string ,role:string)=>{
    return jwt.sign({userId,role},process.env.JWT_ACCESS_SECRET!,{expiresIn:'15m'})
}

export const generateRefreshToken=(userId:string)=>{
    return jwt.sign({userId},process.env.JWT_REFRESH_SECRET!,{expiresIn:"7d"})
}
