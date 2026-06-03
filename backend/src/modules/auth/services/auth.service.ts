import bcrypt from "bcryptjs"
import prisma from "../../../shared/config/prisma.js"
import { generateAcessToken,generateRefreshToken } from "../../../shared/utils/jwt.js"
import { UserRole } from "@prisma/client"
import {z} from "zod"
import { signupSchema ,loginSchema } from "../validations/auth.validation.js"

type SignupInput = z.infer<typeof signupSchema>

type LoginInput = z.infer<typeof loginSchema>

export class AuthService{
    static async signup(data:SignupInput){
        console.log(data)
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

    static async login(data:LoginInput){
        const {identifier,password} =data

        const user = await prisma.user.findFirst({
            where:{
                OR:[
                    {phone:identifier},
                    {email:identifier}
                ]
            }
        })

        if(!user){
            throw new Error("User not found")
        }

        // comapring password 
        const ispasswordValid = await bcrypt.compare(password,user.password)
        
        if(!ispasswordValid){
            throw new Error("Invalid Password")
        }

        const accessToken = generateAcessToken(user.id,user.role)

        const refreshToken = generateRefreshToken(user.id)

        await prisma.user.update({
            where:{
                id:user.id
            },
            data:{
                refreshToken
            }
        })

        return {
            user:{
                id:user.id,
                name:user.name,
                phone:user.phone,
                email:user.email,
                role:user.role,
            },
            accessToken,
            refreshToken
        }
    }


}