import { priceBooking, type BidRules, type PricingRates } from "../../shared/pricing/bookingPricing.js";

// A stand-in for PlatformRatesService with fixed rates (₹10 flat fee, 10% service charge, 3% agent),
// so tests don't need platform-setting mocks. Pass overrides to try other rates.
export function fakeRatesService(overrides: Partial<PricingRates> = {}, bidOverrides: Partial<BidRules> = {}) {
  const bidRules: BidRules = {
    bidMinPercent: 80,
    bidMaxPercent: 110,
    budgetMinPercentOfBase: 70,
    budgetMaxPercentOfBase: 300,
    ...bidOverrides,
  };
  const rates: PricingRates = { fixedFee: 10, servicePercent: 10, agentPercent: 3, ...overrides };
  return {
    getRates: async () => rates,
    getBidRules: async () => bidRules,
    price: async (workCharge: number, agentManaged: boolean) => priceBooking(workCharge, rates, agentManaged),
  };
}
