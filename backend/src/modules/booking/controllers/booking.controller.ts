import type { Response } from "express"
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js"
import { BookingService } from "../services/booking.service.js"

export class BookingController {

    static async getProviderBookings(
        req: AuthRequest,
        res: Response
    ) {

        try {

            const bookings =
                await BookingService.getProviderBookings(
                    req.user!.userId
                );

            return res.status(200).json({
                success: true,
                bookings,
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message,
            });

        }

    }

    static async getWorkerBookings(
        req: AuthRequest,
        res: Response
    ) {

        try {

            const bookings =
                await BookingService.getWorkerBookings(
                    req.user!.userId
                );

            return res.status(200).json({
                success: true,
                bookings,
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message,
            });

        }

    }

    static async getBookingById(
        req: AuthRequest,
        res: Response
    ) {

        try {

            const bookingId =
                req.params.bookingId;

            if (
                !bookingId ||
                Array.isArray(bookingId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking id",
                });
            }

            const booking =
                await BookingService.getBookingById(
                    bookingId
                );

            return res.status(200).json({
                success: true,
                booking,
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message,
            });

        }

    }
    static async startWork(
        req: AuthRequest,
        res: Response
    ) {
        try {

            const bookingId =
                req.params.bookingId;

            if (
                !bookingId ||
                Array.isArray(bookingId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking id",
                });
            }

            const booking =
                await BookingService.startWork(
                    bookingId,
                    req.user!.userId
                );

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message,
            });

        }
    }

    static async completeWork(
        req: AuthRequest,
        res: Response
    ) {
        try {

            const bookingId =
                req.params.bookingId;

            if (
                !bookingId ||
                Array.isArray(bookingId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking id",
                });
            }

            const booking =
                await BookingService.completeWork(
                    bookingId,
                    req.user!.userId
                );
        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message,
            });

        }
    }

}