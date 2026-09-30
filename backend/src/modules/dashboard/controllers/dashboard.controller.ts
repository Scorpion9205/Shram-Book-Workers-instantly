import type { Request, Response } from "express";
import { BaseController } from "../../../core/base/BaseController.js";
import type { IDashboardService } from "../interfaces/IDashboardService.js";

export class DashboardController extends BaseController {
  constructor(private readonly dashboardService: IDashboardService) {
    super();
  }

  getWorkerDashboard = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { range, startDate, endDate } = req.query;

    const dashboard = await this.dashboardService.getWorkerDashboard(
      user.userId,
      range as string,
      startDate as string,
      endDate as string,
    );

    this.ok(res, { dashboard }, "Worker dashboard retrieved successfully");
  };

  getProviderDashboard = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { range, startDate, endDate } = req.query;

    const dashboard = await this.dashboardService.getProviderDashboard(
      user.userId,
      range as string,
      startDate as string,
      endDate as string,
    );

    this.ok(res, { dashboard }, "Provider dashboard retrieved successfully");
  };
}
