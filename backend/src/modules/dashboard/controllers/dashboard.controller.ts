import type{ Response } from "express";

import type{ AuthRequest } from "../../../shared/middleware/auth.middleware.js";

import { DashboardService } from "../services/dashboard.service.js";

export class DashboardController {

  static async getWorkerDashboard(
    req: AuthRequest,
    res: Response
  ) {

    try {
      const { range, startDate, endDate } = req.query;

      const dashboard =
        await DashboardService.getWorkerDashboard(
          req.user!.userId,
          range as string,
          startDate as string,
          endDate as string
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
    const { range, startDate, endDate } = req.query;

    const dashboard =
      await DashboardService.getProviderDashboard(
        req.user!.userId,
        range as string,
        startDate as string,
        endDate as string
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