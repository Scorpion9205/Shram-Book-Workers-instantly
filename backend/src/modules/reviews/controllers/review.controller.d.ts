import type { Request, Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
export declare class ReviewController {
    static createReview(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getWorkerRating(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getWorkerReviews(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getProviderReviews(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=review.controller.d.ts.map