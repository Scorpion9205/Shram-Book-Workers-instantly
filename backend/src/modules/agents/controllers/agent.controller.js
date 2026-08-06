import { AgentService } from "../services/agent.service.js";
import { createAgentProfileSchema, updateAgentProfileSchema, } from "../validations/agent.validation.js";
export class AgentController {
    static async createProfile(req, res) {
        try {
            const validation = createAgentProfileSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    errors: validation.error.flatten()
                        .fieldErrors,
                });
            }
            const profile = await AgentService.createProfile(req.user.userId, validation.data);
            return res.status(201).json({
                success: true,
                message: "Agent profile created successfully.",
                data: profile,
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
            const profile = await AgentService.getMyProfile(req.user.userId);
            return res.status(200).json({
                success: true,
                data: profile,
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
            const validation = updateAgentProfileSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    errors: validation.error.flatten()
                        .fieldErrors,
                });
            }
            const profile = await AgentService.updateProfile(req.user.userId, validation.data);
            return res.status(200).json({
                success: true,
                message: "Agent profile updated successfully.",
                data: profile,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async getDashboard(req, res) {
        try {
            const dashboard = await AgentService.getDashboard(req.user.userId);
            return res.status(200).json({
                success: true,
                data: dashboard
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    static async getMyApplications(req, res) {
        try {
            const applications = await AgentService.getMyApplications(req.user.userId);
            return res.status(200).json({
                success: true,
                data: applications,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async getMyBookings(req, res) {
        try {
            const bookings = await AgentService.getMyBookings(req.user.userId);
            return res.status(200).json({
                success: true,
                data: bookings,
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
//# sourceMappingURL=agent.controller.js.map