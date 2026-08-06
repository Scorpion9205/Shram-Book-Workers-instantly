import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
export declare class LocationController {
    static updateLocation(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getMyLocation(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=location.controller.d.ts.map