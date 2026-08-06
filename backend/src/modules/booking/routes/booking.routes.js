import { Router } from "express";
import { BookingController } from "../controllers/booking.controller.js";
import { authMiddleware } from "../../../shared/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../shared/middleware/role.middleware.js";
const router = Router();
router.get("/provider", authMiddleware, roleMiddleware("PROVIDER"), BookingController.getProviderBookings);
router.get("/worker", authMiddleware, roleMiddleware("WORKER"), BookingController.getWorkerBookings);
router.get("/:bookingId", authMiddleware, BookingController.getBookingById);
router.patch("/:bookingId/start", authMiddleware, roleMiddleware("WORKER"), BookingController.startWork);
router.patch("/:bookingId/complete", authMiddleware, roleMiddleware("WORKER"), BookingController.completeWork);
export default router;
//# sourceMappingURL=booking.routes.js.map