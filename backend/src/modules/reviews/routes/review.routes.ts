import { Router } from "express";

import { authMiddleware } from "../../../shared/middleware/auth.middleware.js";

import { roleMiddleware } from "../../../shared/middleware/role.middleware.js";

import { ReviewController } from "../controllers/review.controller.js";

const router = Router();

router.post(
  "/:bookingId",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  ReviewController.createReview
);

router.get(
  "/worker/:workerId/rating",
  ReviewController.getWorkerRating
);
export default router;