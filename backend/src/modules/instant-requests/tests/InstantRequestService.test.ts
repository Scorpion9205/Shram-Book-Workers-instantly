import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstantRequestService } from "../services/instant-request.service.js";
import { NotFoundException, BusinessException, BadRequestException } from "../../../core/exceptions/index.js";

vi.mock("../../../socket/socket.js", () => ({
  getIO: () => ({
    to: () => ({ emit: vi.fn() }),
  }),
}));

vi.mock("../../../shared/services/cache/cache-invalidation.service.js", () => ({
  CacheInvalidationService: {
    afterInstantRequestAccepted: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("InstantRequestService", () => {
  let requestRepoMock: any;
  let workerRepoMock: any;
  let cacheMock: any;
  let prismaMock: any;
  let matchingServiceMock: any;
  let service: InstantRequestService;

  beforeEach(() => {
    requestRepoMock = {
      upsertProviderProfile: vi.fn(),
      createRequest: vi.fn(),
      createRequestItems: vi.fn(),
      findRequestWithItemsAndProvider: vi.fn(),
      findRequestById: vi.fn(),
      findRequestsByProvider: vi.fn(),
      findProviderProfileByUserId: vi.fn(),
      findWorkerWithSkills: vi.fn(),
      findWorkerWithSkillsAndUser: vi.fn(),
      findOpenNearbyRequestsForSkills: vi.fn(),
      findRequestItemWithRequest: vi.fn(),
      findResponseByItemAndWorker: vi.fn(),
      createResponse: vi.fn(),
      incrementAcceptedWorkersIfSlotAvailable: vi.fn(),
      findItemById: vi.fn(),
      markItemFilled: vi.fn(),
      countOpenItemsForRequest: vi.fn(),
      markRequestFilled: vi.fn(),
      createBooking: vi.fn(),
      markWorkerUnavailable: vi.fn(),
      findWorkerSkillIds: vi.fn(),
      upsertBid: vi.fn(),
      findBidById: vi.fn(),
      markBidSelected: vi.fn(),
      rejectOtherBids: vi.fn(),
    };
    workerRepoMock = {
      updateAvailability: vi.fn(),
    };
    cacheMock = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      acquireLock: vi.fn().mockResolvedValue("lock-token"),
      releaseLock: vi.fn(),
      geoRemove: vi.fn(),
    };
    prismaMock = {
      transaction: vi.fn((cb) => cb(prismaMock)),
    };
    matchingServiceMock = {
      startMatching: vi.fn().mockResolvedValue(undefined),
    };

    service = new InstantRequestService(
      requestRepoMock,
      workerRepoMock,
      cacheMock,
      prismaMock,
      matchingServiceMock,
    );
  });

  describe("getMyRequests", () => {
    it("throws NotFoundException when the caller has no ProviderProfile", async () => {
      requestRepoMock.findProviderProfileByUserId.mockResolvedValue(null);

      await expect(service.getMyRequests("user_1")).rejects.toThrow(NotFoundException);
      expect(requestRepoMock.findRequestsByProvider).not.toHaveBeenCalled();
    });

    it("returns the provider's requests when a ProviderProfile exists", async () => {
      requestRepoMock.findProviderProfileByUserId.mockResolvedValue({ userId: "user_1" });
      requestRepoMock.findRequestsByProvider.mockResolvedValue([{ id: "req_1" }]);

      const result = await service.getMyRequests("user_1");

      expect(result).toEqual([{ id: "req_1" }]);
      expect(requestRepoMock.findRequestsByProvider).toHaveBeenCalledWith("user_1");
    });
  });

  describe("submitBid", () => {
    it("emits the bid with real worker rating/experience/totalJobs, not hardcoded mock values", async () => {
      requestRepoMock.findWorkerWithSkillsAndUser.mockResolvedValue({
        id: "worker_1",
        isAvailable: true,
        user: { isActive: true },
      });
      requestRepoMock.findRequestById.mockResolvedValue({
        id: "req_1",
        providerId: "provider_1",
        bookingMode: "BIDDING",
        status: "OPEN",
        amount: 1000,
        expiresAt: new Date(Date.now() + 60_000),
      });
      requestRepoMock.upsertBid.mockResolvedValue({
        id: "bid_1",
        instantRequestId: "req_1",
        bidAmount: 900,
        worker: {
          user: { name: "Test Worker" },
          rating: 3.7,
          experience: 5,
          totalJobs: 42,
        },
      });

      const bid = await service.submitBid("worker_user_1", "req_1", 900);

      expect(bid.id).toBe("bid_1");
      expect(requestRepoMock.upsertBid).toHaveBeenCalledWith("req_1", "worker_1", 900, prismaMock);
    });

    it("rejects a bid outside the 20% discount band", async () => {
      requestRepoMock.findWorkerWithSkillsAndUser.mockResolvedValue({
        id: "worker_1",
        isAvailable: true,
        user: { isActive: true },
      });
      requestRepoMock.findRequestById.mockResolvedValue({
        id: "req_1",
        providerId: "provider_1",
        bookingMode: "BIDDING",
        status: "OPEN",
        amount: 1000,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.submitBid("worker_user_1", "req_1", 700)).rejects.toThrow(BadRequestException);
    });
  });

  describe("acceptRequest", () => {
    it("throws CONCURRENT_LOCK when the item lock can't be acquired", async () => {
      requestRepoMock.findWorkerWithSkills.mockResolvedValue({
        id: "worker_1",
        userId: "worker_user_1",
        isAvailable: true,
        skills: [{ skillId: "skill_1" }],
      });
      cacheMock.acquireLock.mockResolvedValue(null);

      await expect(service.acceptRequest("worker_user_1", "item_1")).rejects.toThrow(BusinessException);
    });

    it("creates a booking and marks the worker unavailable on a successful accept", async () => {
      const worker = {
        id: "worker_1",
        userId: "worker_user_1",
        isAvailable: true,
        skills: [{ skillId: "skill_1" }],
      };
      requestRepoMock.findWorkerWithSkills.mockResolvedValue(worker);
      requestRepoMock.findRequestItemWithRequest.mockResolvedValue({
        id: "item_1",
        requestId: "req_1",
        skillId: "skill_1",
        acceptedWorkers: 0,
        requiredWorkers: 1,
        request: { id: "req_1", bookingMode: "DIRECT", status: "OPEN", providerId: "provider_1", amount: 500 },
      });
      requestRepoMock.findResponseByItemAndWorker.mockResolvedValue(null);
      requestRepoMock.createResponse.mockResolvedValue({ id: "response_1" });
      requestRepoMock.createBooking.mockResolvedValue({ id: "booking_1" });
      requestRepoMock.incrementAcceptedWorkersIfSlotAvailable.mockResolvedValue(1);
      requestRepoMock.findItemById.mockResolvedValue({
        id: "item_1",
        requestId: "req_1",
        acceptedWorkers: 1,
        requiredWorkers: 1,
      });
      requestRepoMock.countOpenItemsForRequest.mockResolvedValue(0);

      const result = await service.acceptRequest("worker_user_1", "item_1");

      expect(result.bookingId).toBe("booking_1");
      expect(workerRepoMock.updateAvailability).toHaveBeenCalledWith("worker_user_1", false, prismaMock);
      expect(requestRepoMock.markItemFilled).toHaveBeenCalledWith("item_1", prismaMock);
      expect(requestRepoMock.markRequestFilled).toHaveBeenCalledWith("req_1", prismaMock);
      expect(cacheMock.releaseLock).toHaveBeenCalledWith("lock:instant-item:item_1", "lock-token");
    });
  });
});
