import type { Response } from "express";

import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
import { updateLocationSchema } from "../validations/location.validation.js";
import { LocationService } from "../services/location.services.js";

export class LocationController {
  static async updateLocation(
    req: AuthRequest,
    res: Response
  ) {
    try {
      const validationResult =
        updateLocationSchema.safeParse(
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

      const location =
        await LocationService.updateLocation(
          req.user!.userId,
          validationResult.data
        );

      return res.status(200).json({
        success: true,
        location,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async getMyLocation(
    req: AuthRequest,
    res: Response
  ) {
    try {
      const location =
        await LocationService.getMyLocation(
          req.user!.userId
        );

      return res.status(200).json({
        success: true,
        location,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }
}