import type { Request, Response } from "express";
import { BaseController } from "../../../core/base/BaseController.js";
import type { ILocationService } from "../interfaces/ILocationService.js";
import { updateLocationSchema } from "../validations/location.validation.js";

export class LocationController extends BaseController {
  constructor(private readonly locationService: ILocationService) {
    super();
  }

  updateLocation = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const data = this.validate(updateLocationSchema, req.body);
    const location = await this.locationService.updateLocation(user.userId, data);
    this.ok(res, { location }, "Location updated successfully");
  };

  getMyLocation = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const location = await this.locationService.getMyLocation(user.userId);
    this.ok(res, { location }, "Location retrieved successfully");
  };
}
