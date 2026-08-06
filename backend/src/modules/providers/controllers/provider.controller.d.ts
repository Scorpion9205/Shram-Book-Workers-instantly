import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
export declare class ProviderController {
    static createProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getMyProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=provider.controller.d.ts.map