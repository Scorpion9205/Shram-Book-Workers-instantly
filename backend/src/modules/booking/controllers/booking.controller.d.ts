import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
export declare class BookingController {
    static getProviderBookings(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getWorkerBookings(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getBookingById(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static startWork(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static completeWork(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=booking.controller.d.ts.map