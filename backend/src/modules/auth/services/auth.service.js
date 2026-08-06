import bcrypt from "bcryptjs";
import prisma from "../../../shared/config/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../../../shared/utils/jwt.js";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { signupSchema, loginSchema } from "../validations/auth.validation.js";
import jwt from "jsonwebtoken";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
import { emailService } from "../../../shared/email/index.js";
import { randomUUID } from "crypto";
import { verificationService } from "../../../shared/verification/index.js";
export class AuthService {
    // static async signup(data: SignupInput) {
    //     const { name, phone, email, password, role } = data
    //     const existingUser = await prisma.user.findFirst({
    //         where: {
    //             OR: [
    //                 { phone }, ...(email ? [{ email }] : [])
    //             ]
    //         }
    //     })
    //     if (existingUser) {
    //         throw new Error("User already exists")
    //     }
    //     const salt = await bcrypt.genSalt(10)
    //     const hashedPassword = await bcrypt.hash(password, salt)
    //     const user = await prisma.user.create({
    //         data: {
    //             name,
    //             phone,
    //             email: email ?? null,
    //             password: hashedPassword,
    //             role: role as UserRole,
    //         }
    //     });
    //     const accessToken = generateAccessToken(user.id, user.role)
    //     const refreshToken = generateRefreshToken(user.id)
    //     await RedisService.set(
    //         `refresh:${user.id}`,
    //         refreshToken,
    //         7 * 24 * 60 * 60
    //     );
    //     if (user.email) {
    //         try {
    //             await verificationService.sendOTP(
    //                 user.email,
    //                 user.name
    //             );
    //         } catch (error) {
    //             console.error(
    //                 "Failed to send verification OTP:",
    //                 error
    //             );
    //             throw new Error(
    //                 "Unable to send verification email. Please try again."
    //             );
    //         }
    //     }
    //     return {
    //         user: {
    //             id: user.id,
    //             name: user.name,
    //             phone: user.phone,
    //             email: user.email,
    //             role: user.role
    //         },
    //         accessToken,
    //         refreshToken,
    //     }
    // }
    static async signup(data) {
        const { name, phone, email, password, role, } = data;
        if (!email) {
            throw new Error("Email is required for verification.");
        }
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone },
                    { email },
                ],
            },
        });
        if (existingUser) {
            throw new Error("User already exists.");
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const identifier = email ?? phone;
        await verificationService.storePendingSignup(identifier, {
            name,
            phone,
            email,
            password: hashedPassword,
            role: role,
        });
        try {
            await verificationService.sendOTP(email, name);
        }
        catch (error) {
            await verificationService.deletePendingSignup(email);
            console.error("Failed to send verification OTP:", error);
            throw new Error("Unable to send verification email. Please try again.");
        }
        return {
            success: true,
            message: "Verification OTP sent successfully."
        };
    }
    static async login(data) {
        const { identifier, password } = data;
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: identifier },
                    { email: identifier }
                ]
            }
        });
        if (!user) {
            throw new Error("User not found");
        }
        if (!user.isActive) {
            throw new Error("Account is deactivated");
        }
        const ispasswordValid = await bcrypt.compare(password, user.password);
        if (!ispasswordValid) {
            throw new Error("Invalid Password");
        }
        if (!user.isVerified) {
            throw new Error("Please verify your email before logging in.");
        }
        const accessToken = generateAccessToken(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id);
        await RedisService.set(`refresh:${user.id}`, refreshToken, 7 * 24 * 60 * 60);
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
        };
    }
    static async refreshToken(refreshToken) {
        if (!refreshToken) {
            throw new Error("Refresh token required");
        }
        const payload = jwt.verify(refreshToken, process.env
            .JWT_REFRESH_SECRET);
        const user = await prisma.user.findUnique({
            where: {
                id: payload.userId,
            },
        });
        if (!user) {
            throw new Error("User not found");
        }
        const storedRefreshToken = await RedisService.get(`refresh:${user.id}`);
        if (storedRefreshToken !==
            refreshToken) {
            throw new Error("Invalid refresh token");
        }
        const accessToken = generateAccessToken(user.id, user.role);
        return {
            accessToken,
        };
    }
    static async logout(userId) {
        await RedisService.del(`refresh:${userId}`);
        return true;
    }
    static async forgotPassword(identifier) {
        const user = await prisma.user.findFirst({
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
                message: "If an account exists, you will receive a password reset email.",
            };
        }
        const token = randomUUID();
        await RedisService.set(`reset-password:${token}`, user.id, 15 * 60);
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        if (user.email) {
            await emailService.sendForgotPasswordEmail(user.email, user.name, resetLink)
                .catch(console.error);
        }
        return {
            success: true,
            message: "If an account exists, you will receive a password reset email.",
        };
    }
    static async resetPassword(token, password) {
        const userId = await RedisService.get(`reset-password:${token}`);
        if (!userId) {
            throw new Error("Invalid or expired reset token");
        }
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });
        if (!user) {
            throw new Error("User not found");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                password: hashedPassword,
            },
        });
        await RedisService.del(`reset-password:${token}`);
        await RedisService.del(`refresh:${user.id}`);
        if (user.email) {
            emailService
                .sendPasswordChangedEmail(user.email, user.name)
                .catch(console.error);
        }
        return {
            success: true,
            message: "Password reset successfully",
        };
    }
    static async sendOTP(identifier) {
        await verificationService.sendOTP(identifier);
        return {
            success: true,
            message: "OTP sent successfully."
        };
    }
    static async verifyOTP(identifier, otp) {
        const verified = await verificationService.verifyOTP(identifier, otp);
        if (!verified) {
            throw new Error("Invalid or expired OTP.");
        }
        const pendingSignup = await verificationService.getPendingSignup(identifier);
        if (!pendingSignup) {
            throw new Error("Signup session expired. Please signup again.");
        }
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: pendingSignup.email },
                    { phone: pendingSignup.phone },
                ],
            },
        });
        if (existingUser) {
            throw new Error("User already exists.");
        }
        const user = await prisma.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
                data: {
                    name: pendingSignup.name,
                    phone: pendingSignup.phone,
                    email: pendingSignup.email,
                    password: pendingSignup.password,
                    role: pendingSignup.role,
                    isVerified: true,
                },
            });
            switch (createdUser.role) {
                case "WORKER":
                    await tx.workerProfile.create({
                        data: {
                            userId: createdUser.id,
                        },
                    });
                    break;
                case "PROVIDER":
                    await tx.providerProfile.create({
                        data: {
                            userId: createdUser.id,
                        },
                    });
                    break;
                case "AGENT":
                    await tx.agentProfile.create({
                        data: {
                            userId: createdUser.id,
                            agencyName: "",
                        },
                    });
                    break;
            }
            return createdUser;
        });
        const accessToken = generateAccessToken(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id);
        await RedisService.set(`refresh:${user.id}`, refreshToken, 7 * 24 * 60 * 60);
        await verificationService.deletePendingSignup(identifier);
        if (user.email) {
            try {
                await emailService.sendWelcomeEmail(user.email, user.name);
            }
            catch (error) {
                console.error("Failed to send welcome email:", error);
            }
        }
        return {
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
            },
            accessToken,
            refreshToken,
        };
    }
    static async resendOTP(identifier) {
        await verificationService.sendOTP(identifier);
        return {
            success: true,
            message: "OTP resent successfully."
        };
    }
    static async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });
        if (!user) {
            throw new Error("User not found.");
        }
        const passwordMatched = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatched) {
            throw new Error("Current password is incorrect.");
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                password: hashedPassword,
            },
        });
        await RedisService.del(`refresh:${user.id}`);
        if (user.email) {
            await emailService
                .sendPasswordChangedEmail(user.email, user.name)
                .catch(console.error);
        }
        return {
            success: true,
            message: "Password changed successfully.",
        };
    }
}
//# sourceMappingURL=auth.service.js.map