import type { IFareCalculator, IPricingStrategy, PricingContext } from '../interfaces/IPricingStrategy.js';
import type { IPlatformSettingRepository } from '../../platform-settings/interfaces/IPlatformSettingRepository.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';
import { Logger } from '../../../core/logger/Logger.js';

export class FareCalculator implements IFareCalculator {
  private readonly logger = new Logger('FareCalculator');
  private readonly strategies: IPricingStrategy[];

  constructor(
    baseRateStrategy: IPricingStrategy,
    distanceStrategy: IPricingStrategy,
    demandStrategy: IPricingStrategy,
    weatherStrategy: IPricingStrategy,
    durationStrategy: IPricingStrategy,
    private readonly platformSettingRepo: IPlatformSettingRepository,
    private readonly cache: ICacheService,
  ) {
    this.strategies = [
      baseRateStrategy,
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

    // Execute all strategies in parallel
    const amounts = await Promise.all(
      this.strategies.map((s) => s.calculate(context).catch((err) => {
        this.logger.error('Error running pricing strategy', err);
        return 0; // Failure isolation
      })),
    );

    const rawTotal = amounts.reduce((sum, a) => sum + a, 0);

    // Apply min/max fare caps
    const cappedTotal = await this.applyPricingRules(rawTotal, context.skillId);

    // Deduct platform commission
    const finalFare = await this.applyCommission(cappedTotal);

    this.logger.info(`Fare calculation finished. Raw: ${rawTotal}, Final: ${finalFare}`);

    return {
      estimatedFare: Math.round(finalFare * 100) / 100, // Round to 2 decimal places
    };
  }

  private async applyPricingRules(amount: number, skillId: string): Promise<number> {
    const rules = await this.platformSettingRepo.getPricingRule(skillId);
    if (!rules) return amount;

    if (rules.minFare !== undefined && amount < rules.minFare) {
      return rules.minFare;
    }
    if (rules.maxFare !== undefined && amount > rules.maxFare) {
      return rules.maxFare;
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
