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

  it("skips the worker claim for AGENT-type applications with no pinned worker yet", async () => {
    applicationRepoMock.findById.mockResolvedValue({
      ...pendingWorkerApplication,
      applicantType: "AGENT",
      workerId: null,
      agentId: "agent_1",
      agent: { userId: "agent_user_1" },
      worker: null,
    });
    txMock.workerProfile = { updateMany: vi.fn() };

    await service.acceptApplication("provider_1", "app_1");

    expect(txMock.workerProfile.updateMany).not.toHaveBeenCalled();
    expect(txMock.booking.create).toHaveBeenCalled();
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
});
