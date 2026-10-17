import { describe, it, expect } from "vitest";
import { allowedBidRange, allowedBudgetRange, priceBooking, splitSettledBooking } from "../../../shared/pricing/bookingPricing.js";

const rates = { fixedFee: 10, servicePercent: 10, agentPercent: 3 };

describe("priceBooking (provider pays work + flat fee + 10% of work)", () => {
  it("adds the flat fee and the service charge on top of the work charge", () => {
    expect(priceBooking(1000, rates, false)).toEqual({ total: 1110, work: 1000, agent: 0, platform: 110 });
  });

  it("pays the agent's 3% of the work charge out of the platform side, never from the worker", () => {
    expect(priceBooking(1000, rates, true)).toEqual({ total: 1110, work: 1000, agent: 30, platform: 80 });
  });

  it("always adds up to the total, even with awkward amounts", () => {
    for (const work of [333.33, 99.99, 1, 1234.56, 0.5]) {
      const p = priceBooking(work, rates, true);
      expect(Math.round((p.work + p.agent + p.platform) * 100)).toBe(Math.round(p.total * 100));
    }
  });

  it("never pays the agent more than the platform keeps", () => {
    const p = priceBooking(1000, { fixedFee: 0, servicePercent: 1, agentPercent: 50 }, true);
    expect(p.agent).toBe(10);
    expect(p.platform).toBe(0);
  });

  it("charges nothing when there is no work charge", () => {
    expect(priceBooking(0, rates, true)).toEqual({ total: 0, work: 0, agent: 0, platform: 0 });
  });

  it("follows whatever rates admin sets", () => {
    expect(priceBooking(500, { fixedFee: 25, servicePercent: 12, agentPercent: 4 }, true)).toEqual({
      total: 585, work: 500, agent: 20, platform: 65,
    });
  });
});

describe("splitSettledBooking", () => {
  it("uses the split frozen on the booking, ignoring today's admin rates", () => {
    expect(splitSettledBooking({ amount: 1110, workAmount: 1000, agentAmount: 30 }, true)).toEqual({
      worker: 1000, agent: 30, platform: 80,
    });
  });

  it("gives a non-agent booking no agent cut even if one was stored", () => {
    expect(splitSettledBooking({ amount: 1110, workAmount: 1000, agentAmount: 30 }, false)).toEqual({
      worker: 1000, agent: 0, platform: 110,
    });
  });

  it("falls back to the old 85% / 3% rule for bookings with no stored split", () => {
    expect(splitSettledBooking({ amount: 1000 }, true)).toEqual({ worker: 850, agent: 30, platform: 120 });
    expect(splitSettledBooking({ amount: 1000 }, false)).toEqual({ worker: 850, agent: 0, platform: 150 });
  });

  it("uses the final fare when one was settled", () => {
    expect(splitSettledBooking({ amount: 1000, finalFare: 1200, workAmount: 1000, agentAmount: 0 }, false)).toEqual({
      worker: 1000, agent: 0, platform: 200,
    });
  });
});

describe("price guard rails (budget 70%-300% of base rate, bid 80%-110% of budget)", () => {
  const rules = { bidMinPercent: 80, bidMaxPercent: 110, budgetMinPercentOfBase: 70, budgetMaxPercentOfBase: 300 };

  it("limits a provider's budget to between 70% and 300% of the skill's base rate", () => {
    expect(allowedBudgetRange(500, rules)).toEqual({ min: 350, max: 1500 });
  });

  it("lets a worker bid 20% below to 10% above the provider's budget (500 -> 400 to 550)", () => {
    expect(allowedBidRange(500, 500, rules)).toEqual({ min: 400, max: 550 });
  });

  it("never lets a bid go below the budget floor, even for a low budget", () => {
    // budget 350 (the minimum): 80% of it is 280, but the floor is 350
    expect(allowedBidRange(350, 500, rules)).toEqual({ min: 350, max: 385 });
  });

  it("uses the base rate as the reference when there is no budget", () => {
    expect(allowedBidRange(500, 500, { ...rules, bidMinPercent: 90 })).toEqual({ min: 450, max: 550 });
  });
});
