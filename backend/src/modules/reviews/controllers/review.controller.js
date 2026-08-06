import { ReviewService } from "../services/review.service.js";
import { createReviewSchema, } from "../validations/review.validation.js";
export class ReviewController {
    static async createReview(req, res) {
        try {
            const bookingId = req.params.bookingId;
            if (!bookingId ||
                Array.isArray(bookingId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking id",
                });
            }
            const validationResult = createReviewSchema.safeParse(req.body);
            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors: validationResult.error.flatten()
                        .fieldErrors,
                });
            }
            const review = await ReviewService.createReview(bookingId, req.user.userId, validationResult.data);
            return res.status(201).json({
                success: true,
                review,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async getWorkerRating(req, res) {
        try {
            const workerId = req.params.workerId;
            if (!workerId ||
                Array.isArray(workerId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid worker id",
                });
            }
            const worker = await ReviewService.getWorkerRating(workerId);
            return res.status(200).json({
                success: true,
                worker,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async getWorkerReviews(req, res) {
        try {
            const workerId = req.params.workerId;
            if (!workerId || Array.isArray(workerId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid worker id",
                });
            }
            const worker = await ReviewService.getWorkerReviews(workerId);
            return res.json({
                success: true,
                worker,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async getProviderReviews(req, res) {
        try {
            const providerId = req.params.providerId;
            if (!providerId || Array.isArray(providerId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid provider id",
                });
            }
            const reviews = await ReviewService.getProviderReviews(providerId);
            return res.json({
                success: true,
                reviews,
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
//# sourceMappingURL=review.controller.js.map