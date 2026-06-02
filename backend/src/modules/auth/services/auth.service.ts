import bcrypt from "bcryptjs"
import prisma from "../../../shared/config/prisma.js"
import { generateAcessToken,generateRefreshToken } from "../../../shared/utils/jwt.js"
import { UserRole } from "@prisma/client"
import {z} from "zod"
import { signupSchema } from "../validations/auth.validation.js"

type SignupInput = z.infer<typeof signupSchema>

export class AuthService{
    static async signup(data:SignupInput){
        const {name,phone,email,password,role} = data
        const existingUser = await prisma.user.findFirst({
            where:{
                OR:[
                    {phone},...(email?[{email}]:[])
                ]
            }
        })

        if(existingUser){
            throw new Error("User already exists")
        }

        const salt = await bcrypt.genSalt(10)

        const hashedPassword = await bcrypt.hash(password,salt)

        const user = await prisma.user.create({
            data:{
                name,
                phone,
                email:email??null,
                password:hashedPassword,
                role: role as UserRole,
            }
        });

        const accessToken = generateAcessToken(user.id,user.role)
        const refreshToken = generateRefreshToken(user.id)

        await prisma.user.update({
            where:{
                id:user.id,
            },
            data:{
                refreshToken,
            }
        });

        return {
            user:{
                id:user.id,
                name:user.name,
                phone:user.phone,
                email:user.email,
                role:user.role
            },
            accessToken,
            refreshToken,
        }
    }
}