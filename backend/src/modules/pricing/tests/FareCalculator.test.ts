import { describe, it, expect, vi, beforeEach } from "vitest";
import { FareCalculator } from "../services/FareCalculator.js";
import { BusinessException } from "../../../core/exceptions/index.js";
import type { PricingContext } from "../interfaces/IPricingStrategy.js";

const context: PricingContext = {
  skillId: "skill_1",
  latitude: 12.9,
  longitude: 77.6,
  durationHours: 2,
};

describe("FareCalculator", () => {
  let baseRateStrategy: any;
  let distanceStrategy: any;
  let demandStrategy: any;
  let weatherStrategy: any;
  let durationStrategy: any;
  let platformSettingRepoMock: any;
  let cacheMock: any;
  let pricingRuleRepoMock: any;
  let calculator: FareCalculator;

  beforeEach(() => {
    baseRateStrategy = { calculate: vi.fn().mockResolvedValue(200) };
    distanceStrategy = { calculate: vi.fn().mockResolvedValue(0) };
    demandStrategy = { calculate: vi.fn().mockResolvedValue(0) };
    weatherStrategy = { calculate: vi.fn().mockResolvedValue(0) };
    durationStrategy = { calculate: vi.fn().mockResolvedValue(0) };

    platformSettingRepoMock = { get: vi.fn().mockResolvedValue(null) };
    cacheMock = { get: vi.fn().mockResolvedValue(null), set: vi.fn() };
    pricingRuleRepoMock = { findBySkillId: vi.fn().mockResolvedValue(null) };

    calculator = new FareCalculator(
      baseRateStrategy,
      distanceStrategy,
      demandStrategy,
      weatherStrategy,
      durationStrategy,
      platformSettingRepoMock,
      cacheMock,
      pricingRuleRepoMock,
    );
  });

  it("passes the raw total through unchanged when no PricingRule exists for the skill", async () => {
    // No commission setting either -> defaults to 15%, so 200 * 0.85 = 170
    const result = await calculator.calculate(context);
    expect(result.estimatedFare).toBe(170);
  });

  it("clamps the fare up to minFare when the calculated amount is below the floor", async () => {
    pricingRuleRepoMock.findBySkillId.mockResolvedValue({ minFare: 500, maxFare: null });

    const result = await calculator.calculate(context);

    // Clamped to 500 before commission: 500 * 0.85 = 425
    expect(result.estimatedFare).toBe(425);
  });

  it("clamps the fare down to maxFare when the calculated amount exceeds the ceiling", async () => {
    baseRateStrategy.calculate.mockResolvedValue(1000);
    pricingRuleRepoMock.findBySkillId.mockResolvedValue({ minFare: null, maxFare: 300 });

    const result = await calculator.calculate(context);

    // Clamped to 300 before commission: 300 * 0.85 = 255
    expect(result.estimatedFare).toBe(255);
  });

  it("isolates a failing optional strategy to a zero contribution instead of failing the whole calculation", async () => {
    distanceStrategy.calculate.mockRejectedValue(new Error("Maps API down"));

    const result = await calculator.calculate(context);

    expect(result.estimatedFare).toBe(170); // same as the no-op baseline
  });

  it("throws BusinessException when the base strategy itself fails", async () => {
    baseRateStrategy.calculate.mockRejectedValue(new Error("Skill not found"));
    await expect(calculator.calculate(context)).rejects.toThrow("Skill not found");
  });

  it("throws BusinessException if the final fare is not greater than zero", async () => {
    baseRateStrategy.calculate.mockResolvedValue(0);
    pricingRuleRepoMock.findBySkillId.mockResolvedValue(null);
    await expect(calculator.calculate(context)).rejects.toThrow(BusinessException);
  });
});
