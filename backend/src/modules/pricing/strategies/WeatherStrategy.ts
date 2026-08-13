import type { IPricingStrategy, PricingContext } from '../interfaces/IPricingStrategy.js';
import type { IPlatformSettingRepository } from '../../platform-settings/interfaces/IPlatformSettingRepository.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';

export class WeatherStrategy implements IPricingStrategy {
  constructor(
    private readonly cache: ICacheService,
    private readonly platformSettingRepo: IPlatformSettingRepository,
  ) {}

  async calculate(ctx: PricingContext): Promise<number> {
    const multiplier = await this.getWeatherMultiplier();
    // Return a flat weather surcharge computed based on the multiplier (e.g. 1.2 multiplier adds flat 50)
    return multiplier > 1.0 ? 50 * (multiplier - 1.0) : 0;
  }

  private async getWeatherMultiplier(): Promise<number> {
    const cacheKey = CacheKeys.platformSetting('weatherMultiplier');
    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const setting = await this.platformSettingRepo.get('weatherMultiplier');
    const multiplier = setting && setting.value ? Number(setting.value) : 1.0;

    await this.cache.set(cacheKey, multiplier, 60);
    return multiplier;
  }
}
