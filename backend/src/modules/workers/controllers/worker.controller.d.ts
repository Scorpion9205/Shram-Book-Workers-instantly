import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
export declare class WorkerController {
    static createProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getMyProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateAvailability(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=worker.controller.d.ts.map