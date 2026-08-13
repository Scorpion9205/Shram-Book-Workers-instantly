import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import { IFareCalculator } from '../interfaces/IPricingStrategy.js';
import { PricingEstimateSchema } from '../dto/PricingEstimate.dto.js';

export class PricingController extends BaseController {
  constructor(private readonly fareCalculator: IFareCalculator) {
    super();
  }

  getEstimate = async (req: Request, res: Response): Promise<void> => {
    // Validate inputs from query parameters
    const dto = this.validate(PricingEstimateSchema, req.query);

    const result = await this.fareCalculator.calculate({
      skillId: dto.skillId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      durationHours: dto.durationHours,
      workerLatitude: dto.workerLatitude,
      workerLongitude: dto.workerLongitude,
    });

    this.ok(res, result, 'Fare estimate calculated successfully');
  };
}
