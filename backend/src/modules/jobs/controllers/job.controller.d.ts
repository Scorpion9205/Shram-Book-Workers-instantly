import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
export declare class JobController {
    static createJob(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getAllJobs(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getJobById(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static applyForJob(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getJobApplications(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static acceptApplication(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static rejectApplication(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getMyApplications(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getProviderJobs(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=job.controller.d.ts.map