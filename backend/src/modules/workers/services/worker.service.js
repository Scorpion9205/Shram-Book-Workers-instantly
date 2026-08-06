import prisma from "../../../shared/config/prisma.js";
import { updateWorkerProfileSchema } from "../validations/worker.validation.js";
import { z } from "zod";
export class WorkerService {
    static async createProfile(userId, data) {
        const existingProfile = await prisma.workerProfile.findUnique({
            where: {
                userId,
            },
        });
        if (existingProfile) {
            throw new Error("Worker profile already exists");
        }
        const profile = await prisma.workerProfile.create({
            data: {
                userId,
                bio: data.bio ?? null,
                experience: data.experience,
                dailyRate: data.dailyRate ?? null,
            },
        });
        return profile;
    }
    static async getMyProfile(userId) {
        const worker = await prisma.workerProfile.upsert({
            where: {
                userId,
            },
            update: {},
            create: {
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                        profileImage: true,
                        city: true,
                        state: true,
                        address: true,
                        pincode: true,
                    },
                },
                skills: {
                    select: {
                        skill: true,
                    },
                },
            },
        });
        return {
            ...worker,
            skills: worker.skills.map((item) => item.skill),
        };
    }
    static async updateProfile(userId, data) {
        const updatedWorker = await prisma.workerProfile.upsert({
            where: {
                userId,
            },
            create: {
                userId,
                bio: data.bio ?? null,
                experience: data.experience ?? 0,
                dailyRate: data.dailyRate ?? null,
            },
            update: {
                ...(data.bio !== undefined && {
                    bio: data.bio,
                }),
                ...(data.experience !== undefined && {
                    experience: data.experience,
                }),
                ...(data.dailyRate !== undefined && {
                    dailyRate: data.dailyRate,
                }),
            },
        });
        return updatedWorker;
    }
    static async updateAvailability(userId, data) {
        const updatedWorker = await prisma.workerProfile.upsert({
            where: {
                userId,
            },
            create: {
                userId,
                isAvailable: data.isAvailable,
            },
            update: {
                isAvailable: data.isAvailable,
            },
        });
        return updatedWorker;
    }
}
//# sourceMappingURL=worker.service.js.map