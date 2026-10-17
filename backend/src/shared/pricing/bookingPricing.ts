// The single place that decides what a booking costs the provider and who gets what.
//
//   work     = the worker's charge for the job (their rate / bid / job budget). The worker keeps ALL of it.
//   fixed    = a flat platform fee per booking, set by admin.
//   service  = serviceChargePercent of the work charge (default 10%).
//   total    = work + fixed + service      <- the only number the provider ever sees
//
// For agent-managed bookings the agent gets agentPercent of the work charge (default 3%), taken
// out of the platform's side (fixed + service), so the worker's money is never touched:
//   agent    = agentPercent of work
//   platform = total - work - agent
//
// Everything is worked out in paise and the platform is the remainder, so the parts always add
// up to the total exactly.

export interface PricingRates {
  fixedFee: number;
  servicePercent: number;
  agentPercent: number;
}

export interface BookingPrice {
  total: number;
  work: number;
  agent: number;
  platform: number;
}

const toPaise = (rupees: number): number => Math.round(rupees * 100);
const toRupees = (paise: number): number => paise / 100;

export function priceBooking(workCharge: number, rates: PricingRates, agentManaged: boolean): BookingPrice {
  const workPaise = toPaise(workCharge);
  // No work charge means nothing to book, so no fees either.
  if (workPaise <= 0) return { total: 0, work: 0, agent: 0, platform: 0 };
  const fixedPaise = toPaise(rates.fixedFee);
  const servicePaise = Math.round((workPaise * rates.servicePercent) / 100);
  const totalPaise = workPaise + fixedPaise + servicePaise;

  // The agent can never be paid more than the platform's side of this booking.
  const agentPaise = agentManaged
    ? Math.min(Math.round((workPaise * rates.agentPercent) / 100), fixedPaise + servicePaise)
    : 0;

  return {
    total: toRupees(totalPaise),
    work: toRupees(workPaise),
    agent: toRupees(agentPaise),
    platform: toRupees(totalPaise - workPaise - agentPaise),
  };
}

// Bookings made before the fixed-fee pricing have no stored split. For those the old rule
// applies: the worker got 85% of the amount (platform kept 15%) and an agent got 3% of it.
const LEGACY_WORKER_PERCENT = 85;
const LEGACY_AGENT_PERCENT = 3;

export interface StoredBookingAmounts {
  amount: number;
  finalFare?: number | null;
  workAmount?: number | null;
  agentAmount?: number | null;
}

export interface BookingSplit {
  worker: number;
  agent: number;
  platform: number;
}

// Who gets what from a settled booking. New bookings use the split frozen when they were
// created (so later admin changes can't alter old bookings); old ones fall back to the legacy rule.
export function splitSettledBooking(b: StoredBookingAmounts, agentManaged: boolean): BookingSplit {
  const totalPaise = toPaise(b.finalFare ?? b.amount);

  if (b.workAmount !== null && b.workAmount !== undefined) {
    const workerPaise = Math.min(toPaise(b.workAmount), totalPaise);
    const agentPaise = agentManaged ? Math.min(toPaise(b.agentAmount ?? 0), totalPaise - workerPaise) : 0;
    return {
      worker: toRupees(workerPaise),
      agent: toRupees(agentPaise),
      platform: toRupees(totalPaise - workerPaise - agentPaise),
    };
  }

  const workerPaise = Math.round((totalPaise * LEGACY_WORKER_PERCENT) / 100);
  const agentPaise = agentManaged ? Math.min(Math.round((totalPaise * LEGACY_AGENT_PERCENT) / 100), totalPaise - workerPaise) : 0;
  return {
    worker: toRupees(workerPaise),
    agent: toRupees(agentPaise),
    platform: toRupees(totalPaise - workerPaise - agentPaise),
  };
}

// ---- Price guard rails -------------------------------------------------------------------
// Each skill has a base rate (set by admin) used as the market price. A provider's budget must
// sit within [budgetMin, budgetMax] % of it, and a worker's bid must stay within
// [bidMin, bidMax] % of the budget (or of the base rate when there is no budget), and never
// below the budget floor. This stops "any amount" on both sides.

export interface BidRules {
  bidMinPercent: number;
  bidMaxPercent: number;
  budgetMinPercentOfBase: number;
  budgetMaxPercentOfBase: number;
}

export interface PriceRange {
  min: number;
  max: number;
}

// Whole rupees, rounded so the range never lets through more than the percent allows.
const ceilRupees = (n: number): number => Math.ceil(n - 1e-9);
const floorRupees = (n: number): number => Math.floor(n + 1e-9);

// What a provider may set as the budget (per worker) for a skill.
export function allowedBudgetRange(baseRate: number, rules: BidRules): PriceRange {
  return {
    min: ceilRupees((baseRate * rules.budgetMinPercentOfBase) / 100),
    max: floorRupees((baseRate * rules.budgetMaxPercentOfBase) / 100),
  };
}

// What a worker may bid (per worker). `reference` is the provider's budget, or the skill's base
// rate when the job has no budget.
export function allowedBidRange(reference: number, baseRate: number, rules: BidRules): PriceRange {
  const floor = allowedBudgetRange(baseRate, rules).min;
  return {
    min: Math.max(ceilRupees((reference * rules.bidMinPercent) / 100), floor),
    max: floorRupees((reference * rules.bidMaxPercent) / 100),
  };
}
