import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
export declare class DashboardController {
    static getWorkerDashboard(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getProviderDashboard(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=dashboard.controller.d.ts.map