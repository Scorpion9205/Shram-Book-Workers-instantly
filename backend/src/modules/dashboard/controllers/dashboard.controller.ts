import type{ Response } from "express";

import type{ AuthRequest } from "../../../shared/middleware/auth.middleware.js";

import { DashboardService } from "../services/dashboard.service.js";

export class DashboardController {

  static async getWorkerDashboard(
    req: AuthRequest,
    res: Response
  ) {

    try {

      const dashboard =
        await DashboardService.getWorkerDashboard(
          req.user!.userId
        );

      return res.status(200).json({
        success: true,
        dashboard,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }

  }

  static async getProviderDashboard(
  req: AuthRequest,
  res: Response
) {

  try {

    const dashboard =
      await DashboardService.getProviderDashboard(
        req.user!.userId
      );

    return res.status(200).json({
      success: true,
      dashboard,
    });

  } catch (error: any) {

    return res.status(400).json({
      success: false,
      message: error.message,
    });

  }

}

}