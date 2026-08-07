import { InstantRequestService } from "../services/instant-request.service.js";
import { createInstantRequestSchema, calculateFareSchema } from "../validations/instant-request.validation.js";
import { FareService } from "../../../shared/services/pricing/fare.service.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
import { randomUUID } from "crypto";
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
            // Secure Quote Validation
            const cachedQuote = await RedisService.get(`quote:${validationResult.data.quoteId}`);
            if (!cachedQuote) {
                return res.status(400).json({
                    success: false,
                    message: "Quote has expired or is invalid. Please request a new quote."
                });
            }
            const itemsMatch = validationResult.data.items.every(item => cachedQuote.items.some((cachedItem) => cachedItem.skillId === item.skillId && cachedItem.requiredWorkers === item.requiredWorkers)) && validationResult.data.items.length === cachedQuote.items.length;
            if (!itemsMatch) {
                return res.status(400).json({
                    success: false,
                    message: "Request parameters do not match the generated quote."
                });
            }
            // Overwrite request amount with secure cached quote price
            const inputData = {
                ...validationResult.data,
                amount: cachedQuote.fare
            };
            const request = await InstantRequestService.createInstantRequest(req.user.userId, inputData);
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
            const quoteId = randomUUID();
            const ttlSeconds = 300; // 5 mins
            await RedisService.set(`quote:${quoteId}`, JSON.stringify({
                fare: fare.total,
                items: validationResult.data.items
            }), ttlSeconds);
            return res.status(200).json({
                success: true,
                estimatedFare: fare.total,
                quoteId,
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
    static async submitBid(req, res) {
        try {
            const { id } = req.params;
            const { bidAmount } = req.body;
            if (!id || typeof id !== "string") {
                throw new Error("Invalid request parameter");
            }
            const bid = await InstantRequestService.submitBid(req.user.userId, id, Number(bidAmount));
            return res.status(200).json({ success: true, bid });
        }
        catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
    static async selectBid(req, res) {
        try {
            const { id, bidId } = req.params;
            if (!id || !bidId || typeof id !== "string" || typeof bidId !== "string") {
                throw new Error("Invalid parameters");
            }
            const result = await InstantRequestService.selectBid(req.user.userId, id, bidId);
            return res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
}
//# sourceMappingURL=instant-request.controller.js.map