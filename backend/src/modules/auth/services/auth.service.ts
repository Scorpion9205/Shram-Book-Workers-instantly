import bcrypt from "bcryptjs"
import prisma from "../../../shared/config/prisma.js"
import { generateAccessToken, generateRefreshToken } from "../../../shared/utils/jwt.js"
import { UserRole } from "@prisma/client"
import { z } from "zod"
import { signupSchema, loginSchema } from "../validations/auth.validation.js"
import jwt from "jsonwebtoken"
import { RedisService } from "../../../shared/services/redis/redis.service.js"
import { emailService } from "../../../shared/email/index.js"
import { randomUUID } from "crypto"
import { verificationService } from "../../../shared/verification/index.js";
type SignupInput = z.infer<typeof signupSchema>
type LoginInput = z.infer<typeof loginSchema>

export class AuthService {
    static async signup(data: SignupInput) {
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

        if (user.email) {
            await emailService.sendWelcomeEmail(
                user.email,
                user.name
            )
                .catch((error) => {
                    console.error(
                        "Failed to send welcome email:",
                        error
                    );
                });

        }

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

    static async forgotPassword(
        identifier: string
    ) {

        const user =
            await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: identifier },
                        { phone: identifier },
                    ],
                },
            });


        if (!user) {
            return {
                success: true,
                message:
                    "If an account exists, you will receive a password reset email.",
            };
        }

        const token =
            randomUUID();

        await RedisService.set(
            `reset-password:${token}`,
            user.id,
            15 * 60
        );

        const resetLink =

            `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        if (user.email) {
            await emailService.sendForgotPasswordEmail(
                user.email,
                user.name,
                resetLink
            )
                .catch(console.error);
        }

        return {
            success: true,
            message:
                "If an account exists, you will receive a password reset email.",
        };

    }

    static async resetPassword(
        token: string,
        password: string
    ) {

        const userId =
            await RedisService.get<string>(
                `reset-password:${token}`
            );

        if (!userId) {
            throw new Error(
                "Invalid or expired reset token"
            );
        }

        const user =
            await prisma.user.findUnique({
                where: {
                    id: userId,
                },
            });

        if (!user) {
            throw new Error(
                "User not found"
            );
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                password: hashedPassword,
            },
        });


        await RedisService.del(
            `reset-password:${token}`
        );


        await RedisService.del(
            `refresh:${user.id}`
        );
        if (user.email) {

            emailService
                .sendPasswordChangedEmail(

                    user.email,

                    user.name

                )
                .catch(console.error);

        }
        return {
            success: true,
            message:
                "Password reset successfully",
        };

    }
    static async sendOTP(identifier: string) {

        await verificationService.sendOTP(identifier);

        return {
            success: true,
            message: "OTP sent successfully."
        };

    }

    static async verifyOTP(
        identifier: string,
        otp: string
    ) {

        const verified =
            await verificationService.verifyOTP(
                identifier,
                otp
            );

        if (!verified) {
            throw new Error(
                "Invalid or expired OTP"
            );
        }

        await prisma.user.updateMany({
            where: {
                OR: [
                    { phone: identifier },
                    { email: identifier },
                ],
            },
            data: {
                isVerified: true,
            },
        });

        return {
            success: true,
            message: "OTP verified successfully."
        };

    }

    static async resendOTP(
        identifier: string
    ) {

        await verificationService.sendOTP(identifier);

        return {
            success: true,
            message: "OTP resent successfully."
        };

    }

}
