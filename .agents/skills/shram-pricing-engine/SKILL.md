---
name: shram-pricing-engine
description: >-
  Use this skill when implementing or modifying the SHRAM Pricing Engine:
  FareCalculator, pricing strategies (base rate, distance, demand, weather,
  duration), PlatformSetting integration, and Redis caching of pricing rules.
  Activate when: user asks about fare calculation, pricing strategy pattern,
  or how to compute estimatedFare for a booking.
---

# SHRAM — Pricing Engine (Strategy Pattern)

## Architecture Overview

```
FareCalculator
 ├── BaseRateStrategy      (Skill.baseRate from DB)
 ├── DistanceStrategy      (Google Maps Distance Matrix API)
 ├── DemandStrategy        (online workers vs active requests ratio)
 ├── WeatherStrategy       (external weather API multiplier — admin configured)
 └── DurationStrategy      (hours × multiplier)

→ Sum all strategy results
→ Apply PricingRule caps/floors (admin-managed)
→ Deduct platform commission (PlatformSetting.commissionPercent)
→ Return { estimatedFare: number } ONLY — never breakdown
```

## Strategy Interface

```typescript
// modules/pricing/interfaces/IPricingStrategy.ts
export interface PricingContext {
  skillId: string;
  latitude: number;
  longitude: number;
  durationHours: number;
  workerLatitude?: number;
  workerLongitude?: number;
}

export interface IPricingStrategy {
  calculate(context: PricingContext): Promise<number>;
}
```

## Strategies

```typescript
// modules/pricing/strategies/BaseRateStrategy.ts
export class BaseRateStrategy implements IPricingStrategy {
  constructor(private readonly skillRepo: ISkillRepository) {}

  async calculate(ctx: PricingContext): Promise<number> {
    const skill = await this.skillRepo.findById(ctx.skillId);
    if (!skill) throw new NotFoundException('Skill', ctx.skillId);

    switch (skill.rateUnit) {
      case RateUnit.HOURLY: return Number(skill.baseRate) * ctx.durationHours;
      case RateUnit.DAILY:  return Number(skill.baseRate);
      case RateUnit.FIXED:  return Number(skill.baseRate);
      default:              return Number(skill.baseRate) * ctx.durationHours;
    }
  }
}

// modules/pricing/strategies/DistanceStrategy.ts
export class DistanceStrategy implements IPricingStrategy {
  constructor(
    private readonly mapsProvider: IMapsProvider,
    private readonly cache: ICacheService,
    private readonly platformSettingRepo: IPlatformSettingRepository,
  ) {}

  async calculate(ctx: PricingContext): Promise<number> {
    if (!ctx.workerLatitude || !ctx.workerLongitude) return 0;

    const ratePerKm = await this.getDistanceRate();
    const distanceKm = await this.mapsProvider.getDistanceKm(
      { lat: ctx.workerLatitude, lng: ctx.workerLongitude },
      { lat: ctx.latitude, lng: ctx.longitude },
    );

    return distanceKm * ratePerKm;
  }

  private async getDistanceRate(): Promise<number> {
    const cached = await this.cache.get<number>(CacheKeys.platformSetting('distanceRatePerKm'));
    if (cached !== null) return cached;

    const setting = await this.platformSettingRepo.get('distanceRatePerKm');
    const rate = Number(setting?.value ?? 5);
    await this.cache.set(CacheKeys.platformSetting('distanceRatePerKm'), rate, 60);
    return rate;
  }
}

// modules/pricing/strategies/DemandStrategy.ts
export class DemandStrategy implements IPricingStrategy {
  constructor(
    private readonly cache: ICacheService,
    private readonly platformSettingRepo: IPlatformSettingRepository,
  ) {}

  async calculate(ctx: PricingContext): Promise<number> {
    const [activeWorkers, activeRequests, config] = await Promise.all([
      this.cache.geoSearch('workers:geo', ctx.latitude, ctx.longitude, 5, 'km').then(r => r.length),
      this.getActiveRequests(ctx.latitude, ctx.longitude),
      this.getDemandConfig(),
    ]);

    if (activeWorkers === 0) return config.surgeMultiplier * 100; // no workers available
    const ratio = activeRequests / activeWorkers;
    if (ratio > config.highDemandThreshold) return config.surgeFlatFee;
    return 0;
  }
  // ...
}
```

## FareCalculator (Orchestrator)

```typescript
// modules/pricing/services/FareCalculator.ts
export class FareCalculator {
  private readonly strategies: IPricingStrategy[];

  constructor(
    baseRate: IPricingStrategy,
    distance: IPricingStrategy,
    demand: IPricingStrategy,
    weather: IPricingStrategy,
    duration: IPricingStrategy,
    private readonly platformSettingRepo: IPlatformSettingRepository,
  ) {
    this.strategies = [baseRate, distance, demand, weather, duration];
  }

  async calculate(context: PricingContext): Promise<{ estimatedFare: number }> {
    const amounts = await Promise.all(this.strategies.map(s => s.calculate(context)));
    const rawTotal = amounts.reduce((sum, a) => sum + a, 0);
    const capped = await this.applyPricingRules(rawTotal, context.skillId);
    const afterCommission = await this.deductCommission(capped);

    return { estimatedFare: Math.round(afterCommission * 100) / 100 };
  }

  private async applyPricingRules(amount: number, skillId: string): Promise<number> {
    const rule = await this.platformSettingRepo.getPricingRule(skillId);
    if (!rule) return amount;

    if (rule.minFare && amount < Number(rule.minFare)) return Number(rule.minFare);
    if (rule.maxFare && amount > Number(rule.maxFare)) return Number(rule.maxFare);
    return amount;
  }

  private async deductCommission(amount: number): Promise<number> {
    const commissionPct = await this.platformSettingRepo.get('commissionPercent');
    const commission = Number(commissionPct?.value ?? 15) / 100;
    return amount * (1 - commission);
  }
}
```

## Critical Rules for Pricing

1. **estimatedFare only** — frontend NEVER receives the strategy breakdown
2. **All rates from DB** — no hardcoded values in strategies
3. **Redis cache** — PlatformSettings cached 60s, invalidated on admin update
4. **Decimal** — always use `Decimal` for money in Prisma; convert to `number` only in response
5. **Backend-only** — pricing never computed on frontend; even estimates come from `/pricing/estimate`
