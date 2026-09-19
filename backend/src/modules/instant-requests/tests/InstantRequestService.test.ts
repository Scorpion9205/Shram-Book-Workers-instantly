import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock redis config to avoid socket connection attempts
vi.mock("../../../shared/config/redis.js", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    on: vi.fn(),
  },
}));

import prisma from "../../../shared/config/prisma.js";
import { InstantRequestService } from "../services/instant-request.service.js";
import { FareService } from "../../../shared/services/pricing/fare.service.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
import { InstantMatchingService } from "../services/instant-matching.service.js";
import {
  NotFoundException,
  BadRequestException,
  BusinessException,
  ForbiddenException,
} from "../../../core/exceptions/index.js";

describe("InstantRequestService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(InstantMatchingService, "startMatching").mockResolvedValue(undefined as any);
  });

  describe("createInstantRequest", () => {
    it("should successfully create an instant request and calculate fare", async () => {
      const mockUpsert = vi.spyOn(prisma.providerProfile, "upsert").mockResolvedValue({ id: "prov_1" } as any);
      vi.spyOn(FareService, "calculateInstantFare").mockResolvedValue({
        subtotal: 800,
        platformFee: 80,
        total: 880,
      });

      const mockCreated = {
        id: "req_123",
        providerId: "user_prov",
        title: "Urgent Plumber Needed",
        amount: 880,
        items: [{ id: "item_1", skillId: "skill_plumb", requiredWorkers: 1 }],
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        const tx = {
          platformSetting: {
            findUnique: vi.fn().mockResolvedValue({ value: "30" }),
          },
          instantRequest: {
            create: vi.fn().mockResolvedValue({ id: "req_123" }),
            findUnique: vi.fn().mockResolvedValue(mockCreated),
          },
          instantRequestItem: {
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      const input = {
        title: "Urgent Plumber Needed",
        latitude: 28.6139,
        longitude: 77.209,
        address: "123 Main St",
        amount: 880,
        bookingMode: "DIRECT" as const,
        quoteId: "quote_123",
        items: [{ skillId: "skill_plumb", requiredWorkers: 1 }],
      };

      const result = await InstantRequestService.createInstantRequest("user_prov", input);

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { userId: "user_prov" },
        update: {},
        create: { userId: "user_prov" },
      });
      expect(FareService.calculateInstantFare).toHaveBeenCalledWith(input.items);
      expect(result).toEqual(mockCreated);
      expect(InstantMatchingService.startMatching).toHaveBeenCalledWith("req_123");
    });
  });

  describe("acceptRequest", () => {
    it("should throw NotFoundException if worker profile does not exist", async () => {
      vi.spyOn(prisma.workerProfile, "findUnique").mockResolvedValue(null);

      await expect(
        InstantRequestService.acceptRequest("unknown_user", "item_123")
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BusinessException if worker is marked unavailable", async () => {
      vi.spyOn(prisma.workerProfile, "findUnique").mockResolvedValue({
        id: "w_1",
        userId: "w_user",
        isAvailable: false,
        skills: [],
      } as any);

      await expect(
        InstantRequestService.acceptRequest("w_user", "item_123")
      ).rejects.toThrow(BusinessException);
    });

    it("should throw BusinessException if concurrent lock cannot be acquired", async () => {
      vi.spyOn(prisma.workerProfile, "findUnique").mockResolvedValue({
        id: "w_1",
        userId: "w_user",
        isAvailable: true,
        skills: [],
      } as any);

      vi.spyOn(RedisService, "acquireLock").mockResolvedValue(null);

      await expect(
        InstantRequestService.acceptRequest("w_user", "item_123")
      ).rejects.toThrow(BusinessException);
    });

    it("should throw BadRequestException if request bookingMode is not DIRECT", async () => {
      vi.spyOn(prisma.workerProfile, "findUnique").mockResolvedValue({
        id: "w_1",
        userId: "w_user",
        isAvailable: true,
        skills: [],
      } as any);

      vi.spyOn(RedisService, "acquireLock").mockResolvedValue("lock_token_abc");
      vi.spyOn(RedisService, "releaseLock").mockResolvedValue(undefined as any);

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        const tx = {
          instantRequestItem: {
            findUnique: vi.fn().mockResolvedValue({
              id: "item_123",
              request: { bookingMode: "BIDDING", status: "OPEN" },
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        InstantRequestService.acceptRequest("w_user", "item_123")
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("submitBid", () => {
    it("should throw NotFoundException if worker profile is missing", async () => {
      vi.spyOn(prisma.workerProfile, "findUnique").mockResolvedValue(null);

      await expect(
        InstantRequestService.submitBid("unknown_user", "req_1", 500)
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if request does not support bidding", async () => {
      vi.spyOn(prisma.workerProfile, "findUnique").mockResolvedValue({
        id: "w_1",
        userId: "w_user",
        isAvailable: true,
        user: { isActive: true },
        skills: [{ skillId: "sk_1" }],
      } as any);

      vi.spyOn(prisma.instantRequest, "findUnique").mockResolvedValue({
        id: "req_1",
        bookingMode: "DIRECT",
        status: "OPEN",
        skillId: "sk_1",
        amount: 500,
      } as any);

      await expect(
        InstantRequestService.submitBid("w_user", "req_1", 500)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
