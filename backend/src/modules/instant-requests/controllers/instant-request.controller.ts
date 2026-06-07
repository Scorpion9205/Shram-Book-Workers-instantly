import type { Request, Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
import { InstantRequestService } from "../services/instant-request.service.js";
import { createInstantRequestSchema, calculateFareSchema } from "../validations/instant-request.validation.js";
import { FareService } from "../../../shared/services/pricing/fare.service.js";
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

      const request =
        await InstantRequestService.createInstantRequest(
          req.user!.userId,
          validationResult.data
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

      return res.status(200).json({
        success: true,
        fare,
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
}