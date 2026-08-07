import prisma from "../../../shared/config/prisma.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";

import type { CreateWorkerProfileInput } from "../validations/worker.validation.js";

import { updateWorkerProfileSchema } from "../validations/worker.validation.js";
import { z } from "zod"

type UpdateWorkerProfileInput = z.infer<typeof updateWorkerProfileSchema>

import type { UpdateAvailabilityInput } from "../validations/worker.validation.js";

export class WorkerService {
    static async createProfile(
        userId: string,
        data: CreateWorkerProfileInput
    ) {
        const existingProfile =
            await prisma.workerProfile.findUnique({
                where: {
                    userId,
                },
            });

        if (existingProfile) {
            throw new Error(
                "Worker profile already exists"
            );
        }

        const profile =
            await prisma.workerProfile.create({
                data: {
                    userId,
                    bio: data.bio ?? null,
                    experience: data.experience,
                    dailyRate: data.dailyRate ?? null,
                },
            });

        return profile;
    }

    static async getMyProfile(userId: string) {
        const worker =
            await prisma.workerProfile.upsert({
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

    static async updateProfile(
        userId: string,
        data: UpdateWorkerProfileInput
    ) {
        const updatedWorker =
            await prisma.workerProfile.upsert({
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

    static async updateAvailability(
        userId: string,
        data: UpdateAvailabilityInput
    ) {
        const updatedWorker =
            await prisma.workerProfile.upsert({
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

        // Sync Redis GEO
        const workerWithSkills = await prisma.workerProfile.findUnique({
            where: { userId },
            include: { skills: true, user: { include: { location: true } } }
        });
        if (workerWithSkills) {
            for (const skill of workerWithSkills.skills) {
                if (data.isAvailable && workerWithSkills.user.isActive && workerWithSkills.user.location) {
                    await RedisService.geoAdd(
                        `geo:instant-workers:${skill.skillId}`,
                        workerWithSkills.user.location.longitude,
                        workerWithSkills.user.location.latitude,
                        workerWithSkills.id
                    );
                } else {
                    await RedisService.geoRemove(`geo:instant-workers:${skill.skillId}`, workerWithSkills.id);
                }
            }
        }

        return updatedWorker;
    }
}
