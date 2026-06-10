import { Router } from "express";
import { BookingController } from "../controllers/booking.controller.js";
import { authMiddleware } from "../../../shared/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../shared/middleware/role.middleware.js";
const router = Router();

router.get(
  "/provider",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  BookingController.getProviderBookings
);

router.get(
  "/worker",
  authMiddleware,
  roleMiddleware("WORKER"),
  BookingController.getWorkerBookings
);

router.get(
  "/:bookingId",
  authMiddleware,
  BookingController.getBookingById
);

export default router;