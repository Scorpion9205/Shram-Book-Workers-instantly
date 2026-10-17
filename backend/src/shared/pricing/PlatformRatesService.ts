import type { ICacheService } from '../../core/interfaces/ICacheService.js';
import { CacheKeys } from '../../infrastructure/cache/cacheKeys.js';
import type { IPlatformSettingRepository } from '../../modules/platform-settings/interfaces/IPlatformSettingRepository.js';
import { priceBooking, type BidRules, type BookingPrice, type PricingRates } from './bookingPricing.js';

// Used when admin hasn't set the platform setting.
const DEFAULT_FIXED_FEE = 10;
const DEFAULT_SERVICE_PERCENT = 10;
const DEFAULT_AGENT_PERCENT = 3;
const DEFAULT_BID_MIN_PERCENT = 80;
const DEFAULT_BID_MAX_PERCENT = 110;
const DEFAULT_BUDGET_MIN_PERCENT_OF_BASE = 70;
const DEFAULT_BUDGET_MAX_PERCENT_OF_BASE = 300;

export interface IPlatformRatesService {
  getRates(): Promise<PricingRates>;
  /** The admin-set limits on provider budgets and worker bids. */
  getBidRules(): Promise<BidRules>;
  /** Prices one booking from the worker's work charge using the current admin settings. */
  price(workCharge: number, agentManaged: boolean): Promise<BookingPrice>;
}

// Reads the admin-editable pricing settings (cached for a minute; admin saves clear the cache).
export class PlatformRatesService implements IPlatformRatesService {
  constructor(
    private readonly platformSettingRepo: IPlatformSettingRepository,
    private readonly cache: ICacheService,
  ) {}

  private async getNumber(key: string, fallback: number): Promise<number> {
    const cacheKey = CacheKeys.platformSetting(key);
    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const setting = await this.platformSettingRepo.get(key);
    const value = setting && setting.value !== null && setting.value !== '' ? Number(setting.value) : fallback;
    const safe = Number.isFinite(value) && value >= 0 ? value : fallback;

    await this.cache.set(cacheKey, safe, 60);
    return safe;
  }

  async getRates(): Promise<PricingRates> {
    const [fixedFee, servicePercent, agentPercent] = await Promise.all([
      this.getNumber('platformFixedFee', DEFAULT_FIXED_FEE),
      this.getNumber('serviceChargePercent', DEFAULT_SERVICE_PERCENT),
      this.getNumber('agentCommissionPercent', DEFAULT_AGENT_PERCENT),
    ]);
    return { fixedFee, servicePercent, agentPercent };
  }

  async getBidRules(): Promise<BidRules> {
    const [bidMinPercent, bidMaxPercent, budgetMinPercentOfBase, budgetMaxPercentOfBase] = await Promise.all([
      this.getNumber('bidMinPercent', DEFAULT_BID_MIN_PERCENT),
      this.getNumber('bidMaxPercent', DEFAULT_BID_MAX_PERCENT),
      this.getNumber('budgetMinPercentOfBase', DEFAULT_BUDGET_MIN_PERCENT_OF_BASE),
      this.getNumber('budgetMaxPercentOfBase', DEFAULT_BUDGET_MAX_PERCENT_OF_BASE),
    ]);
    return { bidMinPercent, bidMaxPercent, budgetMinPercentOfBase, budgetMaxPercentOfBase };
  }

  async price(workCharge: number, agentManaged: boolean): Promise<BookingPrice> {
    return priceBooking(workCharge, await this.getRates(), agentManaged);
  }
}
