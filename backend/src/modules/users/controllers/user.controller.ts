import type { Request, Response } from "express"
import { UserService } from "../services/user.service.js"
import { type AuthRequest } from "../../../shared/middleware/auth.middleware.js"
import { changePasswordSchema, updateProfileSchema } from "../validations/user.validation.js"

export class UserController {
    static async getProfile(req: AuthRequest, res: Response) {
        try {
            const user = await UserService.getProfile(req.user!.userId)
            return res.status(200).json({
                success: true,
                user,
            })
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message,
            })
        }
    }

    static async updateProfile(req: AuthRequest, res: Response) {
        try {
            const validationResult =
                updateProfileSchema.safeParse(req.body);

            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors:
                        validationResult.error
                            .flatten()
                            .fieldErrors,
                });
            }

            const updatedUser = await UserService.updateProfile(
                req.user!.userId,
                validationResult.data
            )

            return res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                user: updatedUser,
            })
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message,
            })

        }
    }

    static async deleteAccount(
        req: AuthRequest,
        res: Response
    ) {
        try {
            await UserService.deleteAccount(
                req.user!.userId
            );

            return res.status(200).json({
                success: true,
                message:
                    "Account deleted successfully",
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }


    static async changePassword(
        req: AuthRequest,
        res: Response
    ) {
        try {
            const validationResult =
                changePasswordSchema.safeParse(
                    req.body
                );

            if (
                !validationResult.success
            ) {
                return res.status(400).json({
                    success: false,
                    errors:
                        validationResult.error
                            .flatten()
                            .fieldErrors,
                });
            }

            const {
                oldPassword,
                newPassword,
            } =
                validationResult.data;

            await UserService.changePassword(
                req.user!.userId,
                oldPassword,
                newPassword
            );

            return res.status(200).json({
                success: true,
                message:
                    "Password changed successfully",
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message:
                    error.message,
            });
        }
    }
}