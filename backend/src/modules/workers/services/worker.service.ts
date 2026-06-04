import prisma from "../../../shared/config/prisma.js";

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
            await prisma.workerProfile.findUnique({
                where: {
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
                },
            });

        if (!worker) {
            throw new Error(
                "Worker profile not found"
            );
        }

        return worker;
    }

    static async updateProfile(
        userId: string,
        data: UpdateWorkerProfileInput
    ) {
        const worker =
            await prisma.workerProfile.findUnique({
                where: {
                    userId,
                },
            });

        if (!worker) {
            throw new Error(
                "Worker profile not found"
            );
        }

        const updatedWorker =
            await prisma.workerProfile.update({
                where: {
                    userId,
                },
                data: {
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
        const worker =
            await prisma.workerProfile.findUnique({
                where: {
                    userId,
                },
            });

        if (!worker) {
            throw new Error(
                "Worker profile not found"
            );
        }

        const updatedWorker =
            await prisma.workerProfile.update({
                where: {
                    userId,
                },
                data: {
                    isAvailable: data.isAvailable,
                },
            });

        return updatedWorker;
    }
}
