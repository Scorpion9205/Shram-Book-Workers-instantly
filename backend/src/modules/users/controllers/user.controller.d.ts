import type { Response } from "express";
import { type AuthRequest } from "../../../shared/middleware/auth.middleware.js";
export declare class UserController {
    static getProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteAccount(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static changePassword(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=user.controller.d.ts.map