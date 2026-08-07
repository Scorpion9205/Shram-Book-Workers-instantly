import type { Request, Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
import { InstantRequestService } from "../services/instant-request.service.js";
import { createInstantRequestSchema, calculateFareSchema } from "../validations/instant-request.validation.js";
import { FareService } from "../../../shared/services/pricing/fare.service.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
import { randomUUID } from "crypto";

export class InstantRequestController {

  static async createInstantRequest(
    req: AuthRequest,
    res: Response
  ) {
    try {
      const validationResult =
        createInstantRequestSchema.safeParse(
          req.body
        );

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          errors:
            validationResult.error.flatten()
              .fieldErrors,
        });
      }

      // Secure Quote Validation
      const cachedQuote = await RedisService.get<{ fare: number; items: any[] }>(`quote:${validationResult.data.quoteId}`);
      if (!cachedQuote) {
        return res.status(400).json({
          success: false,
          message: "Quote has expired or is invalid. Please request a new quote."
        });
      }

      const itemsMatch = validationResult.data.items.every(item => 
        cachedQuote.items.some((cachedItem: any) => 
          cachedItem.skillId === item.skillId && cachedItem.requiredWorkers === item.requiredWorkers
        )
      ) && validationResult.data.items.length === cachedQuote.items.length;

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

      const request =
        await InstantRequestService.createInstantRequest(
          req.user!.userId,
          inputData
        );

      return res.status(201).json({
        success: true,
        message:
          "Instant request created successfully",
        request,
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async getNearbyRequests(
    req: AuthRequest,
    res: Response
  ) {
    try {

      const requests =
        await InstantRequestService.getNearbyRequests(
          req.user!.userId
        );

      return res.status(200).json({
        success: true,
        requests,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }
  }

  static async calculateFare(
    req: AuthRequest,
    res: Response
  ) {
    try {
      const validationResult =
        calculateFareSchema.safeParse(
          req.body
        );

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          errors:
            validationResult.error.flatten()
              .fieldErrors,
        });
      }

      const fare =
        await FareService.calculateInstantFare(
          validationResult.data.items
        );

      const quoteId = randomUUID();
      const ttlSeconds = 300; // 5 mins
      await RedisService.set(`quote:${quoteId}`, JSON.stringify({
        fare: fare.total,
        items: validationResult.data.items
      }), ttlSeconds);

      return res.status(200).json({
        success: true,
        estimatedFare: fare.total,
        subtotal: fare.subtotal,
        platformFee: fare.platformFee,
        quoteId,
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async acceptRequest(
    req: AuthRequest,
    res: Response
  ) {
    try {

      const itemId = req.params.itemId;

      if (
        !itemId ||
        Array.isArray(itemId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid item id",
        });
      }

      const result =
        await InstantRequestService.acceptRequest(
          req.user!.userId,
          itemId
        );

      return res.status(200).json({
        success: true,
        data: result,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }
  }

  static async getMyRequests(
    req: AuthRequest,
    res: Response
  ) {
    try {

      const requests =
        await InstantRequestService.getMyRequests(
          req.user!.userId
        );

      return res.status(200).json({
        success: true,
        requests,
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async submitBid(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { bidAmount } = req.body;
      if (!id || typeof id !== "string") {
        throw new Error("Invalid request parameter");
      }
      const bid = await InstantRequestService.submitBid(req.user!.userId, id, Number(bidAmount));
      return res.status(200).json({ success: true, bid });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async selectBid(req: AuthRequest, res: Response) {
    try {
      const { id, bidId } = req.params;
      if (!id || !bidId || typeof id !== "string" || typeof bidId !== "string") {
        throw new Error("Invalid parameters");
      }
      const result = await InstantRequestService.selectBid(req.user!.userId, id, bidId);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}