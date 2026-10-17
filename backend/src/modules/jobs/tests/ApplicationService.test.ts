import { fakeRatesService } from "../../../tests/factories/fakeRatesService.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApplicationService } from "../services/ApplicationService.js";
import { BusinessException } from "../../../core/exceptions/index.js";

vi.mock("../../../shared/services/cache/cache-invalidation.service.js", () => ({
  CacheInvalidationService: { afterJobAccepted: vi.fn() },
}));

describe("ApplicationService.acceptApplication — worker double-booking guard", () => {
  let applicationRepoMock: any;
  let jobRepoMock: any;
  let workerRepoMock: any;
  let agentRepoMock: any;
  let cacheMock: any;
  let prismaMock: any;
  let eventPublisherMock: any;
  let historyRepoMock: any;
  let txMock: any;
  let service: ApplicationService;

  const pendingWorkerApplication = {
    id: "app_1",
    jobId: "job_1",
    workerId: "worker_1",
    agentId: null,
    applicantType: "WORKER",
    status: "PENDING",
    bidAmount: 500,
    worker: { userId: "worker_user_1" },
    agent: null,
    job: { id: "job_1", providerId: "provider_1", status: "OPEN" },
  };

  beforeEach(() => {
    txMock = {
      job: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "job_1", requiredWorkers: 0 }),
        update: vi.fn(),
      },
      booking: {
        create: vi.fn().mockResolvedValue({ id: "booking_1", status: "CREATED" }),
      },
    };

    applicationRepoMock = {
      findById: vi.fn().mockResolvedValue(pendingWorkerApplication),
      update: vi.fn(),
      updateManyPendingToRejected: vi.fn(),
    };
    jobRepoMock = {};
    workerRepoMock = {};
    agentRepoMock = {};
    cacheMock = { set: vi.fn() };
    prismaMock = { client: { $transaction: vi.fn((cb: any) => cb(txMock)) } };
    eventPublisherMock = { publish: vi.fn() };
    historyRepoMock = { append: vi.fn() };

    service = new ApplicationService(
      applicationRepoMock,
      jobRepoMock,
      workerRepoMock,
      agentRepoMock,
      cacheMock,
      prismaMock,
      eventPublisherMock,
      historyRepoMock,
      fakeRatesService(),
    );
  });

  it("claims the worker atomically and creates the booking when the worker is still available", async () => {
    txMock.workerProfile = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) };

    const result = await service.acceptApplication("provider_1", "app_1");

    expect(txMock.workerProfile.updateMany).toHaveBeenCalledWith({
      where: { id: "worker_1", isAvailable: true },
      data: { isAvailable: false },
    });
    expect(txMock.booking.create).toHaveBeenCalled();
    expect(result.bookingId).toBe("booking_1");
  });

  it("rejects the accept when the worker was just claimed by another concurrent accept, without creating a booking", async () => {
    txMock.workerProfile = { updateMany: vi.fn().mockResolvedValue({ count: 0 }) };

    await expect(service.acceptApplication("provider_1", "app_1")).rejects.toThrow(BusinessException);
    expect(txMock.booking.create).not.toHaveBeenCalled();
  });

  it("skips the worker claim AND booking creation for AGENT-type applications — no specific worker is known yet, so there's nothing to book until the Agent assigns one via assignWorkerToApplication", async () => {
    applicationRepoMock.findById.mockResolvedValue({
      ...pendingWorkerApplication,
      applicantType: "AGENT",
      workerId: null,
      agentId: "agent_1",
      agent: { userId: "agent_user_1" },
      worker: null,
    });
    txMock.workerProfile = { updateMany: vi.fn() };

    const result = await service.acceptApplication("provider_1", "app_1");

    expect(txMock.workerProfile.updateMany).not.toHaveBeenCalled();
    expect(txMock.booking.create).not.toHaveBeenCalled();
    expect(result.awaitingWorkerAssignment).toBe(true);
  });
});

describe("ApplicationService.applyForJob", () => {
  let applicationRepoMock: any;
  let jobRepoMock: any;
  let workerRepoMock: any;
  let agentRepoMock: any;
  let service: ApplicationService;

  const openJob = { id: "job_1", providerId: "provider_1", status: "OPEN" };

  beforeEach(() => {
    applicationRepoMock = {
      findByJobAndWorker: vi.fn().mockResolvedValue(null),
      findByJobAndAgent: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "app_1" }),
    };
    jobRepoMock = { findById: vi.fn().mockResolvedValue(openJob) };
    workerRepoMock = { findByUserId: vi.fn().mockResolvedValue({ id: "worker_1" }) };
    agentRepoMock = { findByUserId: vi.fn().mockResolvedValue({ id: "agent_1" }) };

    service = new ApplicationService(
      applicationRepoMock,
      jobRepoMock,
      workerRepoMock,
      agentRepoMock,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeRatesService(),
    );
  });

  it("creates a WORKER application by default", async () => {
    await service.applyForJob("worker_user_1", "job_1", { bidAmount: 500 });

    expect(applicationRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ applicantType: "WORKER", workerId: "worker_1" }),
    );
  });

  it("creates an AGENT application (agentId set, no workerId) when the caller is an Agent — previously always 404'd looking for a WorkerProfile that could never exist", async () => {
    await service.applyForJob("agent_user_1", "job_1", { bidAmount: 500 }, "AGENT");

    expect(workerRepoMock.findByUserId).not.toHaveBeenCalled();
    expect(applicationRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ applicantType: "AGENT", agentId: "agent_1" }),
    );
  });

  it("rejects an Agent applying twice to the same job", async () => {
    applicationRepoMock.findByJobAndAgent.mockResolvedValue({ id: "existing_app" });

    await expect(
      service.applyForJob("agent_user_1", "job_1", { bidAmount: 500 }, "AGENT"),
    ).rejects.toThrow(BusinessException);
    expect(applicationRepoMock.create).not.toHaveBeenCalled();
  });

  it("404s if an Agent role is passed but no AgentProfile exists for that user", async () => {
    agentRepoMock.findByUserId.mockResolvedValue(null);

    await expect(
      service.applyForJob("agent_user_1", "job_1", { bidAmount: 500 }, "AGENT"),
    ).rejects.toThrow();
  });
  describe("bid limits (skill base rate 500, provider budget 500: a bid may be 400 to 550)", () => {
    const pricedJob = { id: "job_1", providerId: "provider_1", status: "OPEN", budget: 500, skill: { baseRate: 500 } };

    beforeEach(() => {
      jobRepoMock.findById.mockResolvedValue(pricedJob);
    });

    it("accepts a bid inside the band, including 10% above the budget", async () => {
      await expect(service.applyForJob("worker_user_1", "job_1", { bidAmount: 450 })).resolves.toBeDefined();
      await expect(service.applyForJob("worker_user_1", "job_1", { bidAmount: 550 })).resolves.toBeDefined();
    });

    it("rejects a bid more than 20% below the budget", async () => {
      await expect(service.applyForJob("worker_user_1", "job_1", { bidAmount: 350 })).rejects.toThrow(BusinessException);
      expect(applicationRepoMock.create).not.toHaveBeenCalled();
    });

    it("rejects a bid more than 10% above the budget", async () => {
      await expect(service.applyForJob("worker_user_1", "job_1", { bidAmount: 600 })).rejects.toThrow(BusinessException);
    });

    it("checks an agent's bid per worker, not on the combined total", async () => {
      // 1000 for 2 workers = 500 each: fine
      await expect(
        service.applyForJob("agent_user_1", "job_1", { bidAmount: 1000, workerCount: 2 }, "AGENT"),
      ).resolves.toBeDefined();
      // 600 for 2 workers = 300 each: too low
      await expect(
        service.applyForJob("agent_user_1", "job_1", { bidAmount: 600, workerCount: 2 }, "AGENT"),
      ).rejects.toThrow(BusinessException);
    });

    it("uses the skill base rate as the reference when the job has no budget", async () => {
      jobRepoMock.findById.mockResolvedValue({ ...pricedJob, budget: null });
      await expect(service.applyForJob("worker_user_1", "job_1", { bidAmount: 400 })).resolves.toBeDefined();
      await expect(service.applyForJob("worker_user_1", "job_1", { bidAmount: 700 })).rejects.toThrow(BusinessException);
    });
  });
});

describe("ApplicationService.assignWorkerToApplication", () => {
  let applicationRepoMock: any;
  let cacheMock: any;
  let prismaMock: any;
  let eventPublisherMock: any;
  let historyRepoMock: any;
  let txMock: any;
  let service: ApplicationService;

  const acceptedAgentApplication = {
    id: "app_1",
    jobId: "job_1",
    agentId: "agent_1",
    applicantType: "AGENT",
    status: "ACCEPTED",
    workerCount: 2,
    bidAmount: 1000,
    job: { id: "job_1", providerId: "provider_1" },
  };

  beforeEach(() => {
    txMock = {
      booking: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: "booking_1", providerId: "provider_1", status: "WORKER_ASSIGNED" }),
      },
      workerProfile: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    applicationRepoMock = { findById: vi.fn().mockResolvedValue(acceptedAgentApplication) };
    cacheMock = { set: vi.fn() };
    prismaMock = { client: { $transaction: vi.fn((cb: any) => cb(txMock)) } };
    eventPublisherMock = { publish: vi.fn() };
    historyRepoMock = { append: vi.fn() };

    service = new ApplicationService(
      applicationRepoMock,
      {} as any,
      {} as any,
      {} as any,
      cacheMock,
      prismaMock,
      eventPublisherMock,
      historyRepoMock,
      fakeRatesService(),
    );
  });

  it("rejects an application that doesn't belong to this agent", async () => {
    applicationRepoMock.findById.mockResolvedValue({ ...acceptedAgentApplication, agentId: "some_other_agent" });

    await expect(service.assignWorkerToApplication("agent_1", "app_1", "worker_1")).rejects.toThrow(BusinessException);
    expect(txMock.booking.create).not.toHaveBeenCalled();
  });

  it("rejects an application that hasn't been accepted by the Provider yet", async () => {
    applicationRepoMock.findById.mockResolvedValue({ ...acceptedAgentApplication, status: "PENDING" });

    await expect(service.assignWorkerToApplication("agent_1", "app_1", "worker_1")).rejects.toThrow(BusinessException);
  });

  it("rejects once all workerCount slots have already been assigned", async () => {
    txMock.booking.count.mockResolvedValue(2); // workerCount is 2

    await expect(service.assignWorkerToApplication("agent_1", "app_1", "worker_1")).rejects.toThrow(BusinessException);
    expect(txMock.booking.create).not.toHaveBeenCalled();
  });

  it("rejects when the chosen worker was just claimed elsewhere", async () => {
    txMock.workerProfile.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.assignWorkerToApplication("agent_1", "app_1", "worker_1")).rejects.toThrow(BusinessException);
    expect(txMock.booking.create).not.toHaveBeenCalled();
  });

  it("creates one OFFLINE booking for the assigned worker, splitting bidAmount evenly across workerCount", async () => {
    await service.assignWorkerToApplication("agent_1", "app_1", "worker_1");

    expect(txMock.workerProfile.updateMany).toHaveBeenCalledWith({
      where: { id: "worker_1", isAvailable: true },
      data: { isAvailable: false },
    });
    expect(txMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobId: "job_1",
          workerId: "worker_1",
          agentId: "agent_1",
          // bid 1000 / 2 workers = 500 work charge; + ₹10 fee + 10% = 560; agent cut 3% of 500 = 15
          amount: 560,
          workAmount: 500,
          agentAmount: 15,
          paymentMode: "OFFLINE",
          status: "WORKER_ASSIGNED",
        }),
      }),
    );
  });
});
