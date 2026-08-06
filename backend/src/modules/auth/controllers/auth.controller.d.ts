import type { Request, Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
export declare class AuthController {
    static signup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static refreshToken(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static logout(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static forgotPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static resetPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static sendOTP(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static verifyOTP(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static resendOTP(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static changePassword(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=auth.controller.d.ts.map