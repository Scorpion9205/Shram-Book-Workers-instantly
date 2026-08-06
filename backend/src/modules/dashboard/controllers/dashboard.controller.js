import { DashboardService } from "../services/dashboard.service.js";
export class DashboardController {
    static async getWorkerDashboard(req, res) {
        try {
            const { range, startDate, endDate } = req.query;
            const dashboard = await DashboardService.getWorkerDashboard(req.user.userId, range, startDate, endDate);
            return res.status(200).json({
                success: true,
                dashboard,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async getProviderDashboard(req, res) {
        try {
            const { range, startDate, endDate } = req.query;
            const dashboard = await DashboardService.getProviderDashboard(req.user.userId, range, startDate, endDate);
            return res.status(200).json({
                success: true,
                dashboard,
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
//# sourceMappingURL=dashboard.controller.js.map