import { ProviderService } from "../services/provider.service.js";
import { createProviderProfileSchema, updateProviderProfileSchema } from "../validations/provider.validation.js";
export class ProviderController {
    static async createProfile(req, res) {
        try {
            const validation = createProviderProfileSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    errors: validation.error.flatten()
                        .fieldErrors,
                });
            }
            const profile = await ProviderService.createProfile(req.user.userId, validation.data);
            return res.status(201).json({
                success: true,
                profile,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async getMyProfile(req, res) {
        try {
            const provider = await ProviderService.getMyProfile(req.user.userId);
            return res.status(200).json({
                success: true,
                provider,
            });
        }
        catch (error) {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async updateProfile(req, res) {
        try {
            const validation = updateProviderProfileSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    errors: validation.error.flatten()
                        .fieldErrors,
                });
            }
            const provider = await ProviderService.updateProfile(req.user.userId, validation.data);
            return res.status(200).json({
                success: true,
                provider,
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
//# sourceMappingURL=provider.controller.js.map