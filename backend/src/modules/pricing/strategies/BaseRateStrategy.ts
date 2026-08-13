import type { IPricingStrategy, PricingContext, ISkillRepository } from '../interfaces/IPricingStrategy.js';
import { NotFoundException } from '../../../core/exceptions/index.js';
import { RateUnit } from '@prisma/client';

export class BaseRateStrategy implements IPricingStrategy {
  constructor(private readonly skillRepo: ISkillRepository) {}

  async calculate(ctx: PricingContext): Promise<number> {
    const skill = await this.skillRepo.findById(ctx.skillId);
    if (!skill) {
      throw new NotFoundException('Skill', ctx.skillId);
    }

    const rate = Number(skill.baseRate);

    switch (skill.rateUnit) {
      case RateUnit.HOURLY:
        return rate * ctx.durationHours;
      case RateUnit.DAILY:
      case RateUnit.FIXED:
      default:
        return rate;
    }
  }
}
