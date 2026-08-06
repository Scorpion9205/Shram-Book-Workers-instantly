import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
export declare class AgentController {
    static createProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getMyProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getDashboard(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getMyApplications(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getMyBookings(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=agent.controller.d.ts.map