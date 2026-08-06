import { UserService } from "../services/user.service.js";
import {} from "../../../shared/middleware/auth.middleware.js";
import { changePasswordSchema, updateProfileSchema } from "../validations/user.validation.js";
export class UserController {
    static async getProfile(req, res) {
        try {
            const user = await UserService.getProfile(req.user.userId);
            return res.status(200).json({
                success: true,
                user,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async updateProfile(req, res) {
        try {
            const validationResult = updateProfileSchema.safeParse(req.body);
            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors: validationResult.error
                        .flatten()
                        .fieldErrors,
                });
            }
            const updatedUser = await UserService.updateProfile(req.user.userId, validationResult.data);
            return res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                user: updatedUser,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async deleteAccount(req, res) {
        try {
            await UserService.deleteAccount(req.user.userId);
            return res.status(200).json({
                success: true,
                message: "Account deleted successfully",
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async changePassword(req, res) {
        try {
            const validationResult = changePasswordSchema.safeParse(req.body);
            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors: validationResult.error
                        .flatten()
                        .fieldErrors,
                });
            }
            const { oldPassword, newPassword, } = validationResult.data;
            await UserService.changePassword(req.user.userId, oldPassword, newPassword);
            return res.status(200).json({
                success: true,
                message: "Password changed successfully",
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
}
//# sourceMappingURL=user.controller.js.map