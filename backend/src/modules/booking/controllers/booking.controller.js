import { BookingService } from "../services/booking.service.js";
export class BookingController {
    static async getProviderBookings(req, res) {
        try {
            const bookings = await BookingService.getProviderBookings(req.user.userId);
            return res.status(200).json({
                success: true,
                bookings,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async getWorkerBookings(req, res) {
        try {
            const bookings = await BookingService.getWorkerBookings(req.user.userId);
            return res.status(200).json({
                success: true,
                bookings,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async getBookingById(req, res) {
        try {
            const bookingId = req.params.bookingId;
            if (!bookingId ||
                Array.isArray(bookingId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking id",
                });
            }
            const booking = await BookingService.getBookingById(bookingId);
            return res.status(200).json({
                success: true,
                booking,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async startWork(req, res) {
        try {
            const bookingId = req.params.bookingId;
            if (!bookingId ||
                Array.isArray(bookingId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking id",
                });
            }
            const { otp } = req.body;
            const booking = await BookingService.startWork(bookingId, req.user.userId, otp);
            return res.status(200).json({
                success: true,
                message: "Work started successfully",
                booking,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async completeWork(req, res) {
        try {
            const bookingId = req.params.bookingId;
            if (!bookingId ||
                Array.isArray(bookingId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking id",
                });
            }
            const booking = await BookingService.completeWork(bookingId, req.user.userId);
            return res.status(200).json({
                success: true,
                message: "Work completed successfully",
                booking,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
}
//# sourceMappingURL=booking.controller.js.map