import { IPricingStrategy, PricingContext } from '../interfaces/IPricingStrategy.js';

export class DurationStrategy implements IPricingStrategy {
  async calculate(ctx: PricingContext): Promise<number> {
    // Overtime pricing: if job duration exceeds 8 standard hours, apply overtime rate (e.g. flat 50 per extra hour)
    if (ctx.durationHours > 8) {
      const extraHours = ctx.durationHours - 8;
      return extraHours * 50;
    }
    return 0;
  }
}
