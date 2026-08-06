import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
export declare class SkillController {
    static getSkills(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static assignSkills(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getMySkills(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=skill.controller.d.ts.map