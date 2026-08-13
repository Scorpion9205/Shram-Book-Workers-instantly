import { IPricingStrategy, PricingContext, IMapsProvider } from '../interfaces/IPricingStrategy.js';
import { IPlatformSettingRepository } from '../../platform-settings/interfaces/IPlatformSettingRepository.js';
import { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';

export class DistanceStrategy implements IPricingStrategy {
  constructor(
    private readonly mapsProvider: IMapsProvider,
    private readonly cache: ICacheService,
    private readonly platformSettingRepo: IPlatformSettingRepository,
  ) {}

  async calculate(ctx: PricingContext): Promise<number> {
    if (ctx.workerLatitude === undefined || ctx.workerLongitude === undefined) {
      return 0;
    }

    const ratePerKm = await this.getDistanceRate();
    const distanceKm = await this.mapsProvider.getDistanceKm(
      { lat: ctx.workerLatitude, lng: ctx.workerLongitude },
      { lat: ctx.latitude, lng: ctx.longitude },
    );

    return distanceKm * ratePerKm;
  }

  private async getDistanceRate(): Promise<number> {
    const cacheKey = CacheKeys.platformSetting('distanceRatePerKm');
    const cached = await this.cache.get<number>(cacheKey);

    if (cached !== null) {
      return cached;
    }

    const setting = await this.platformSettingRepo.get('distanceRatePerKm');
    const rate = setting && setting.value ? Number(setting.value) : 5; // Default fallback

    await this.cache.set(cacheKey, rate, 60); // 60s cache TTL
    return rate;
  }
}
