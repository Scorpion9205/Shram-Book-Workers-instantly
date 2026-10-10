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
    cacheMock = { set: vi.fn() };
    prismaMock = { client: { $transaction: vi.fn((cb: any) => cb(txMock)) } };
    eventPublisherMock = { publish: vi.fn() };
    historyRepoMock = { append: vi.fn() };

    service = new ApplicationService(
      applicationRepoMock,
      jobRepoMock,
      workerRepoMock,
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
