import prisma from "../../../shared/config/prisma.js";
import bcrypt from "bcryptjs"

export class UserService {
    static async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                role: true,
                isVerified: true,

                createdAt: true,
                updatedAt: true,
            }
        });
        if (!user) {
            throw new Error("User not found")
        }
        return user
    }

    static async updateProfile(
        userId: string,
        data: {
            name?: string,
            email?: string,
            address?: string,
            city?: string,
            state?: string,
            pincode?: string,
            profileImage?: string;
        }

    ) {
        return await prisma.user.update({
            where: {
                id: userId
            }, data,

            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                role: true,
                address: true,
                city: true,
                state: true,
                pincode: true,
                profileImage: true,
            }

        })


    }

    static async deleteAccount(
        userId: string
    ) {
        await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                isActive: false,
                refreshToken: null,
            },
        });

        return true;
    }

    static async changePassword(
        userId: string,
        oldPassword: string,
        newPassword: string
    ) {
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

        const isPasswordValid =
            await bcrypt.compare(
                oldPassword,
                user.password
            );

        if (!isPasswordValid) {
            throw new Error(
                "Old password is incorrect"
            );
        }

        const hashedPassword =
            await bcrypt.hash(
                newPassword,
                10
            );

        await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                password:
                    hashedPassword,
            },
        });

        return true;
    }
}