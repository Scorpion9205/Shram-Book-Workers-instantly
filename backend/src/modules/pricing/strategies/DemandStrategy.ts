import { IPricingStrategy, PricingContext } from '../interfaces/IPricingStrategy.js';
import { IPlatformSettingRepository } from '../../platform-settings/interfaces/IPlatformSettingRepository.js';
import { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';

export class DemandStrategy implements IPricingStrategy {
  constructor(
    private readonly cache: ICacheService,
    private readonly platformSettingRepo: IPlatformSettingRepository,
  ) {}

  async calculate(ctx: PricingContext): Promise<number> {
    const geoKey = CacheKeys.workerLocation;
    
    // 1. Get count of workers in 5km radius
    const activeWorkers = await this.cache.geoSearch(
      geoKey,
      ctx.latitude,
      ctx.longitude,
      5,
      'km',
    ).then((r) => r.length);

    // 2. Fallback if no workers are online near the coordinates
    if (activeWorkers === 0) {
      const surgeMultiplier = await this.getSettingCached('surgeMultiplier', 1.2);
      return (surgeMultiplier - 1.0) * 100; // Flat surge multiplier equivalent
    }

    // 3. Fetch active requests count nearby (mock/simulate for development, or query from cache namespace)
    const activeRequests = await this.getActiveRequestsCount(ctx.latitude, ctx.longitude);

    // 4. Retrieve settings
    const highDemandThreshold = await this.getSettingCached('highDemandThreshold', 1.5);
    const surgeFlatFee = await this.getSettingCached('surgeFlatFee', 100);

    const ratio = activeRequests / activeWorkers;
    if (ratio > highDemandThreshold) {
      return surgeFlatFee;
    }

    return 0;
  }

  private async getActiveRequestsCount(lat: number, lng: number): Promise<number> {
    // Return a mocked value or fetch active request coordinates from cache index
    // For development, we return a default mock ratio/count
    return 2; 
  }

  private async getSettingCached(key: string, defaultValue: number): Promise<number> {
    const cacheKey = CacheKeys.platformSetting(key);
    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const setting = await this.platformSettingRepo.get(key);
    const value = setting && setting.value ? Number(setting.value) : defaultValue;
    
    await this.cache.set(cacheKey, value, 60);
    return value;
  }
}
