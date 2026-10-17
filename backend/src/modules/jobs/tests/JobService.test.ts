import { describe, it, expect, vi, beforeEach } from "vitest";
import { JobService } from "../services/JobService.js";
import { BusinessException } from "../../../core/exceptions/index.js";
import { fakeRatesService } from "../../../tests/factories/fakeRatesService.js";

vi.mock("../../../shared/services/cache/cache-invalidation.service.js", () => ({
  CacheInvalidationService: { afterJobCreated: vi.fn() },
}));

describe("JobService.createJob — budget limits", () => {
  let jobRepoMock: any;
  let prismaMock: any;
  let service: JobService;

  // Plumber base rate 500 -> a budget may be 350 (70%) to 1500 (300%) per worker.
  const input = { title: "Fix leak", skillId: "skill_1", requiredWorkers: 1 };

  beforeEach(() => {
    jobRepoMock = { create: vi.fn().mockResolvedValue({ id: "job_1" }) };
    prismaMock = {
      client: {
        providerProfile: { upsert: vi.fn() },
        skill: { findUnique: vi.fn().mockResolvedValue({ id: "skill_1", name: "Plumber", baseRate: 500 }) },
      },
    };
    service = new JobService(jobRepoMock, {} as any, {} as any, {} as any, {} as any, prismaMock, fakeRatesService());
  });

  it("accepts a budget inside the allowed range", async () => {
    await service.createJob("provider_1", { ...input, budget: 500 });
    expect(jobRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({ budget: 500 }));
  });

  it("rejects a budget below 70% of the skill's base rate", async () => {
    await expect(service.createJob("provider_1", { ...input, budget: 300 })).rejects.toThrow(BusinessException);
    expect(jobRepoMock.create).not.toHaveBeenCalled();
  });

  it("rejects a budget above 300% of the base rate (an extra zero by mistake)", async () => {
    await expect(service.createJob("provider_1", { ...input, budget: 5000 })).rejects.toThrow(BusinessException);
  });

  it("allows a job with no budget at all", async () => {
    await service.createJob("provider_1", input);
    expect(jobRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({ budget: null }));
  });
});
