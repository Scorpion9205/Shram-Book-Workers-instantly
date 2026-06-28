import bcrypt from "bcryptjs"
import prisma from "../../../shared/config/prisma.js"
import { generateAccessToken, generateRefreshToken } from "../../../shared/utils/jwt.js"
import { UserRole } from "@prisma/client"
import { z } from "zod"
import { signupSchema, loginSchema } from "../validations/auth.validation.js"
import jwt from "jsonwebtoken"
import { RedisService } from "../../../shared/services/redis/redis.service.js"
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js"
import { redis } from "../../../shared/config/redis.js"
type SignupInput = z.infer<typeof signupSchema>

type LoginInput = z.infer<typeof loginSchema>

export class AuthService {
    static async signup(data: SignupInput) {
        console.log(data)
        const { name, phone, email, password, role } = data
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone }, ...(email ? [{ email }] : [])
                ]
            }
        })

        if (existingUser) {
            throw new Error("User already exists")
        }

        const salt = await bcrypt.genSalt(10)

        const hashedPassword = await bcrypt.hash(password, salt)

        const user = await prisma.user.create({
            data: {
                name,
                phone,
                email: email ?? null,
                password: hashedPassword,
                role: role as UserRole,
            }
        });

        const accessToken = generateAccessToken(user.id, user.role)
        const refreshToken = generateRefreshToken(user.id)

        await RedisService.set(
            `refresh:${user.id}`,
            refreshToken,
            7 * 24 * 60 * 60
        );

        return {
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role
            },
            accessToken,
            refreshToken,
        }
    }

    static async login(data: LoginInput) {
        const { identifier, password } = data

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: identifier },
                    { email: identifier }
                ]
            }
        })

        if (!user) {
            throw new Error("User not found")
        }

        if (!user.isActive) {
            throw new Error("Account is deactivated");
        }

        // comapring password 
        const ispasswordValid = await bcrypt.compare(password, user.password)

        if (!ispasswordValid) {
            throw new Error("Invalid Password")
        }

        const accessToken = generateAccessToken(user.id, user.role)

        const refreshToken = generateRefreshToken(user.id)

        await RedisService.set(
            `refresh:${user.id}`,
            refreshToken,
            7 * 24 * 60 * 60
        );
        
        return {
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
            },
            accessToken,
            refreshToken
        }
    }

    static async refreshToken(
        refreshToken: string
    ) {
        if (!refreshToken) {
            throw new Error(
                "Refresh token required"
            );
        }

        const payload =
            jwt.verify(
                refreshToken,
                process.env
                    .JWT_REFRESH_SECRET!
            ) as {
                userId: string;
            };

        const user =
            await prisma.user.findUnique({
                where: {
                    id: payload.userId,
                },
            });

        if (!user) {
            throw new Error(
                "User not found"
            );
        }

        const storedRefreshToken =
            await RedisService.get<string>(
                `refresh:${user.id}`
            );

        if (
            storedRefreshToken !==
            refreshToken
        ) {
            throw new Error(
                "Invalid refresh token"
            );
        }

        const accessToken =
            generateAccessToken(
                user.id,
                user.role
            );

        return {
            accessToken,
        };

    }

    static async logout(userId: string) {
        await RedisService.del(
            `refresh:${userId}`
        );
        return true;
    }


}