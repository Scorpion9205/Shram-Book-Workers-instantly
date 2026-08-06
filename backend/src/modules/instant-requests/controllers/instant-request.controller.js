import { InstantRequestService } from "../services/instant-request.service.js";
import { createInstantRequestSchema, calculateFareSchema } from "../validations/instant-request.validation.js";
import { FareService } from "../../../shared/services/pricing/fare.service.js";
export class InstantRequestController {
    static async createInstantRequest(req, res) {
        try {
            const validationResult = createInstantRequestSchema.safeParse(req.body);
            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors: validationResult.error.flatten()
                        .fieldErrors,
                });
            }
            const request = await InstantRequestService.createInstantRequest(req.user.userId, validationResult.data);
            return res.status(201).json({
                success: true,
                message: "Instant request created successfully",
                request,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async getNearbyRequests(req, res) {
        try {
            const requests = await InstantRequestService.getNearbyRequests(req.user.userId);
            return res.status(200).json({
                success: true,
                requests,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async calculateFare(req, res) {
        try {
            const validationResult = calculateFareSchema.safeParse(req.body);
            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors: validationResult.error.flatten()
                        .fieldErrors,
                });
            }
            const fare = await FareService.calculateInstantFare(validationResult.data.items);
            return res.status(200).json({
                success: true,
                fare,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async acceptRequest(req, res) {
        try {
            const itemId = req.params.itemId;
            if (!itemId ||
                Array.isArray(itemId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid item id",
                });
            }
            const result = await InstantRequestService.acceptRequest(req.user.userId, itemId);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async getMyRequests(req, res) {
        try {
            const requests = await InstantRequestService.getMyRequests(req.user.userId);
            return res.status(200).json({
                success: true,
                requests,
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
//# sourceMappingURL=instant-request.controller.js.map