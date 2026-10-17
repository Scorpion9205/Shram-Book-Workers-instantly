import type { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../../core/base/BaseController.js';
import { NotFoundException } from '../../../core/exceptions/index.js';
import type { IFareCalculator, ISkillRepository } from '../interfaces/IPricingStrategy.js';
import type { IPlatformRatesService } from '../../../shared/pricing/PlatformRatesService.js';
import { allowedBidRange, allowedBudgetRange } from '../../../shared/pricing/bookingPricing.js';
import { PricingEstimateSchema } from '../dto/PricingEstimate.dto.js';

const QuoteQuerySchema = z.object({
  // What the worker will earn per worker (their work charge).
  amount: z.coerce.number().positive().max(10_000_000),
  agentManaged: z.enum(['true', 'false']).optional(),
});

const LimitsQuerySchema = z.object({
  skillId: z.string().uuid(),
  // The provider's budget, when the job has one. Bids are checked against it.
  budget: z.coerce.number().positive().optional(),
});

export class PricingController extends BaseController {
  constructor(
    private readonly fareCalculator: IFareCalculator,
    private readonly ratesService: IPlatformRatesService,
    private readonly skillRepo: ISkillRepository,
  ) {
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

  // What the provider would pay in total for a given work charge. Only the total is returned,
  // never the fee breakdown.
  getQuote = async (req: Request, res: Response): Promise<void> => {
    const dto = this.validate(QuoteQuerySchema, req.query);
    const price = await this.ratesService.price(dto.amount, dto.agentManaged === 'true');
    this.ok(res, { total: price.total }, 'Quote calculated successfully');
  };

  // The allowed price ranges for a skill: the budget a provider may set, and the bid a worker
  // may place (around the budget, or the base rate if there is none).
  getLimits = async (req: Request, res: Response): Promise<void> => {
    const dto = this.validate(LimitsQuerySchema, req.query);
    const skill = await this.skillRepo.findById(dto.skillId);
    if (!skill) {
      throw new NotFoundException('Skill', dto.skillId);
    }

    const baseRate = Number(skill.baseRate);
    const rules = await this.ratesService.getBidRules();
    this.ok(
      res,
      {
        skillName: skill.name,
        baseRate,
        budget: allowedBudgetRange(baseRate, rules),
        bid: allowedBidRange(dto.budget ?? baseRate, baseRate, rules),
      },
      'Price limits retrieved successfully',
    );
  };
}
