import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../shared/config/redis.js", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    on: vi.fn(),
  },
}));

import { JobService } from "../services/JobService.js";
import { NotFoundException, AuthenticationException } from "../../../core/exceptions/index.js";
import { CacheInvalidationService } from "../../../shared/services/cache/cache-invalidation.service.js";

describe("JobService", () => {
  let jobRepoMock: any;
  let workerRepoMock: any;
  let agentRepoMock: any;
  let agentWorkerRepoMock: any;
  let cacheMock: any;
  let prismaMock: any;
  let service: JobService;

  beforeEach(() => {
    vi.spyOn(CacheInvalidationService, "afterJobCreated").mockResolvedValue(undefined as any);

    jobRepoMock = {
      create: vi.fn(),
      findById: vi.fn(),
      findManyOpenBySkillIds: vi.fn(),
      findManyByProviderId: vi.fn(),
    };

    workerRepoMock = {
      findByUserId: vi.fn(),
      getProfileWithSkillsAndUser: vi.fn(),
    };

    agentRepoMock = {
      findByUserId: vi.fn(),
    };

    agentWorkerRepoMock = {
      findManyByAgentId: vi.fn(),
    };

    cacheMock = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };

    prismaMock = {
      client: {
        providerProfile: {
          upsert: vi.fn().mockResolvedValue({ id: "prov_1" }),
        },
        skill: {
          findUnique: vi.fn(),
        },
        user: {
          findUnique: vi.fn(),
        },
        workerProfile: {
          findUnique: vi.fn(),
        },
        application: {
          findFirst: vi.fn(),
        },
      },
    };

    service = new JobService(
      jobRepoMock,
      workerRepoMock,
      agentRepoMock,
      agentWorkerRepoMock,
      cacheMock,
      prismaMock
    );
  });

  describe("createJob", () => {
    it("should successfully create a job when skill exists", async () => {
      prismaMock.client.skill.findUnique.mockResolvedValue({ id: "skill_1", name: "Carpentry" });
      const jobData = {
        title: "Table Assembly",
        skillId: "skill_1",
        requiredWorkers: 2,
        budget: 1200,
        address: "123 Market St",
      };
      const createdJob = { id: "job_123", ...jobData, providerId: "provider_1" };
      jobRepoMock.create.mockResolvedValue(createdJob);

      const result = await service.createJob("provider_1", jobData);

      expect(result).toEqual(createdJob);
      expect(prismaMock.client.providerProfile.upsert).toHaveBeenCalledWith({
        where: { userId: "provider_1" },
        update: {},
        create: { userId: "provider_1" },
      });
      expect(jobRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({
        title: "Table Assembly",
        skillId: "skill_1",
        requiredWorkers: 2,
        providerId: "provider_1",
      }));
    });

    it("should throw NotFoundException if skill does not exist", async () => {
      prismaMock.client.skill.findUnique.mockResolvedValue(null);

      await expect(
        service.createJob("provider_1", { skillId: "invalid_skill", requiredWorkers: 1, title: "Job" })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getJobById", () => {
    it("should return job details with hasApplied false when user has not applied", async () => {
      jobRepoMock.findById.mockResolvedValue({ id: "job_123", title: "Painting" });
      prismaMock.client.workerProfile.findUnique.mockResolvedValue({ id: "worker_1" });
      prismaMock.client.application.findFirst.mockResolvedValue(null);

      const result = await service.getJobById("job_123", "user_worker");

      expect(result).toEqual({ id: "job_123", title: "Painting", hasApplied: false });
    });

    it("should return hasApplied true when worker has an active application", async () => {
      jobRepoMock.findById.mockResolvedValue({ id: "job_123", title: "Painting" });
      prismaMock.client.workerProfile.findUnique.mockResolvedValue({ id: "worker_1" });
      prismaMock.client.application.findFirst.mockResolvedValue({ id: "app_1" });

      const result = await service.getJobById("job_123", "user_worker");

      expect(result).toEqual({ id: "job_123", title: "Painting", hasApplied: true });
    });

    it("should throw NotFoundException if job does not exist", async () => {
      jobRepoMock.findById.mockResolvedValue(null);

      await expect(service.getJobById("non_existent")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAllJobs", () => {
    it("should throw AuthenticationException if user role is not WORKER or AGENT", async () => {
      prismaMock.client.user.findUnique.mockResolvedValue({ id: "provider_1", role: "PROVIDER" });

      await expect(service.getAllJobs("provider_1")).rejects.toThrow(AuthenticationException);
    });

    it("should return open jobs matching worker skills", async () => {
      prismaMock.client.user.findUnique.mockResolvedValue({ id: "worker_user", role: "WORKER" });
      workerRepoMock.findByUserId.mockResolvedValue({ id: "worker_1" });
      workerRepoMock.getProfileWithSkillsAndUser.mockResolvedValue({
        skills: [{ skillId: "skill_carpentry" }],
      });
      jobRepoMock.findManyOpenBySkillIds.mockResolvedValue([{ id: "job_carpentry" }]);

      const result = await service.getAllJobs("worker_user");

      expect(result).toEqual({ jobs: [{ id: "job_carpentry" }] });
      expect(jobRepoMock.findManyOpenBySkillIds).toHaveBeenCalledWith(["skill_carpentry"]);
    });

    it("should return cached jobs when available in Redis", async () => {
      prismaMock.client.user.findUnique.mockResolvedValue({ id: "worker_user", role: "WORKER" });
      workerRepoMock.findByUserId.mockResolvedValue({ id: "worker_1" });
      workerRepoMock.getProfileWithSkillsAndUser.mockResolvedValue({
        skills: [{ skillId: "skill_carpentry" }],
      });
      cacheMock.get.mockResolvedValue({ jobs: [{ id: "job_cached" }] });

      const result = await service.getAllJobs("worker_user");

      expect(result).toEqual({ jobs: [{ id: "job_cached" }] });
      expect(jobRepoMock.findManyOpenBySkillIds).not.toHaveBeenCalled();
    });
  });
});
