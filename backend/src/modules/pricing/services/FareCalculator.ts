import type { IFareCalculator, IPricingStrategy, PricingContext } from '../interfaces/IPricingStrategy.js';
import type { IPlatformSettingRepository } from '../../platform-settings/interfaces/IPlatformSettingRepository.js';
import type { IPricingRuleRepository } from '../../pricing-rules/interfaces/IPricingRuleRepository.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';
import { Logger } from '../../../core/logger/Logger.js';
import { BusinessException } from '../../../core/exceptions/index.js';

export class FareCalculator implements IFareCalculator {
  private readonly logger = new Logger('FareCalculator');
  // Only these are safe to zero-out on failure — they're additive modifiers, not the
  // core price. BaseRateStrategy is intentionally excluded: if it fails (e.g. a deleted
  // skillId), pricing must abort loudly, not silently produce a near-zero fare.
  private readonly optionalStrategies: IPricingStrategy[];

  constructor(
    private readonly baseRateStrategy: IPricingStrategy,
    distanceStrategy: IPricingStrategy,
    demandStrategy: IPricingStrategy,
    weatherStrategy: IPricingStrategy,
    durationStrategy: IPricingStrategy,
    private readonly platformSettingRepo: IPlatformSettingRepository,
    private readonly cache: ICacheService,
    private readonly pricingRuleRepo: IPricingRuleRepository,
  ) {
    this.optionalStrategies = [
      distanceStrategy,
      demandStrategy,
      weatherStrategy,
      durationStrategy,
    ];
  }

  async calculate(context: PricingContext): Promise<{ estimatedFare: number }> {
    this.logger.info('Calculating estimated fare for context', {
      skillId: context.skillId,
      durationHours: context.durationHours,
    });

    // Base rate must succeed — let it throw (e.g. NotFoundException on a bad skillId)
    // rather than being isolated away into a 0 contribution.
    const baseAmount = await this.baseRateStrategy.calculate(context);

    // Execute optional modifiers in parallel; a failure here degrades gracefully to 0.
    const optionalAmounts = await Promise.all(
      this.optionalStrategies.map((s) => s.calculate(context).catch((err) => {
        this.logger.error('Error running pricing strategy', err);
        return 0; // Failure isolation — non-critical modifiers only
      })),
    );

    const rawTotal = baseAmount + optionalAmounts.reduce((sum, a) => sum + a, 0);

    // Apply min/max fare caps
    const cappedTotal = await this.applyPricingRules(rawTotal, context.skillId);

    // Deduct platform commission
    const finalFare = await this.applyCommission(cappedTotal);

    this.logger.info(`Fare calculation finished. Raw: ${rawTotal}, Final: ${finalFare}`);

    if (!(finalFare > 0)) {
      throw new BusinessException('INVALID_FARE_CALCULATION', 'Calculated fare must be greater than zero');
    }

    return {
      estimatedFare: Math.round(finalFare * 100) / 100, // Round to 2 decimal places
    };
  }

  private async applyPricingRules(amount: number, skillId: string): Promise<number> {
    const rule = await this.pricingRuleRepo.findBySkillId(skillId);
    if (!rule) return amount;

    const minFare = rule.minFare !== null ? Number(rule.minFare) : undefined;
    const maxFare = rule.maxFare !== null ? Number(rule.maxFare) : undefined;

    if (minFare !== undefined && amount < minFare) {
      return minFare;
    }
    if (maxFare !== undefined && amount > maxFare) {
      return maxFare;
    }
    return amount;
  }

  private async applyCommission(amount: number): Promise<number> {
    const cacheKey = CacheKeys.platformSetting('commissionPercent');
    const cached = await this.cache.get<number>(cacheKey);

    let commissionPct = 15;
    if (cached !== null) {
      commissionPct = cached;
    } else {
      const setting = await this.platformSettingRepo.get('commissionPercent');
      commissionPct = setting && setting.value ? Number(setting.value) : 15;
      await this.cache.set(cacheKey, commissionPct, 60);
    }

    const factor = 1 - commissionPct / 100;
    return amount * factor;
  }
}
