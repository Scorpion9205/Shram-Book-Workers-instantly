import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
export declare class InstantRequestController {
    static createInstantRequest(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getNearbyRequests(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static calculateFare(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static acceptRequest(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getMyRequests(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=instant-request.controller.d.ts.map