import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
import { createWorkerProfileSchema, updateAvailabilitySchema, updateWorkerProfileSchema } from "../validations/worker.validation.js";
import { WorkerService } from "../services/worker.service.js";

export class WorkerController {
    static async createProfile(
        req: AuthRequest,
        res: Response
    ) {
        try {
            const validationResult =
                createWorkerProfileSchema.safeParse(
                    req.body
                );

            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors:
                        validationResult.error.flatten()
                            .fieldErrors,
                });
            }

            const profile =
                await WorkerService.createProfile(
                    req.user!.userId,
                    validationResult.data
                );

            return res.status(201).json({
                success: true,
                profile,
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    static async getMyProfile(
        req: AuthRequest,
        res: Response
    ) {
        try {
            const worker =
                await WorkerService.getMyProfile(
                    req.user!.userId
                );

            return res.status(200).json({
                success: true,
                worker,
            });
        } catch (error: any) {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
    }

    static async updateProfile(
        req: AuthRequest,
        res: Response
    ) {
        try {
            const validationResult =
                updateWorkerProfileSchema.safeParse(
                    req.body
                );

            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors:
                        validationResult.error.flatten()
                            .fieldErrors,
                });
            }

            const worker =
                await WorkerService.updateProfile(
                    req.user!.userId,
                    validationResult.data
                );

            return res.status(200).json({
                success: true,
                worker,
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    static async updateAvailability(
        req: AuthRequest,
        res: Response
    ) {
        try {
            const validationResult =
                updateAvailabilitySchema.safeParse(
                    req.body
                );

            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors:
                        validationResult.error.flatten()
                            .fieldErrors,
                });
            }

            const worker =
                await WorkerService.updateAvailability(
                    req.user!.userId,
                    validationResult.data
                );

            return res.status(200).json({
                success: true,
                worker,
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
}