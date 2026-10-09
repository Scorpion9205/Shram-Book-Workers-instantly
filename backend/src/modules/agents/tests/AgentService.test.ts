import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentService } from "../services/AgentService.js";
import { NotFoundException } from "../../../core/exceptions/index.js";

describe("AgentService", () => {
  let agentRepoMock: any;
  let platformSettingRepoMock: any;
  let cacheMock: any;
  let service: AgentService;

  const agent = { id: "agent_1", userId: "user_1", agencyName: "Acme Staffing" };

  beforeEach(() => {
    agentRepoMock = {
      findByUserId: vi.fn(),
      findCommissionableBookings: vi.fn(),
    };
    platformSettingRepoMock = { get: vi.fn() };
    cacheMock = { get: vi.fn().mockResolvedValue(null), set: vi.fn() };

    service = new AgentService(
      agentRepoMock,
      {} as any, // agentWorkerRepo
      {} as any, // prisma
      platformSettingRepoMock,
      cacheMock,
    );
  });

  describe("getCommissionSummary", () => {
    it("throws NotFoundException when the agent profile doesn't exist", async () => {
      agentRepoMock.findByUserId.mockResolvedValue(null);
      await expect(service.getCommissionSummary("user_1")).rejects.toThrow(NotFoundException);
    });

    it("computes commission per booking using finalFare over amount when present, at the platform-set rate", async () => {
      agentRepoMock.findByUserId.mockResolvedValue(agent);
      platformSettingRepoMock.get.mockResolvedValue({ value: 20 });
      agentRepoMock.findCommissionableBookings.mockResolvedValue([
        { id: "booking_1", amount: 1000, finalFare: 800, completedAt: new Date("2026-01-01") },
        { id: "booking_2", amount: 500, finalFare: null, completedAt: new Date("2026-01-02") },
      ]);

      const result = await service.getCommissionSummary("user_1");

      expect(result.commissionPercent).toBe(20);
      expect(result.bookingCount).toBe(2);
      // booking_1: finalFare 800 -> commission 160; booking_2: amount 500 -> commission 100
      expect(result.totalGrossBookingValue).toBe(1300);
      expect(result.totalEarnings).toBe(260);
      expect(result.recentCommissions).toHaveLength(2);
      expect(result.recentCommissions[0]).toMatchObject({ bookingId: "booking_1", grossAmount: 800, commission: 160 });
    });

    it("falls back to the default commission rate when no platform setting exists", async () => {
      agentRepoMock.findByUserId.mockResolvedValue(agent);
      platformSettingRepoMock.get.mockResolvedValue(null);
      agentRepoMock.findCommissionableBookings.mockResolvedValue([
        { id: "booking_1", amount: 1000, finalFare: null, completedAt: null },
      ]);

      const result = await service.getCommissionSummary("user_1");

      expect(result.commissionPercent).toBe(10); // DEFAULT_AGENT_COMMISSION_PERCENT
      expect(result.totalEarnings).toBe(100);
    });

    it("returns zeroed totals when the agent has no commissionable bookings", async () => {
      agentRepoMock.findByUserId.mockResolvedValue(agent);
      platformSettingRepoMock.get.mockResolvedValue({ value: 10 });
      agentRepoMock.findCommissionableBookings.mockResolvedValue([]);

      const result = await service.getCommissionSummary("user_1");

      expect(result.bookingCount).toBe(0);
      expect(result.totalEarnings).toBe(0);
      expect(result.totalGrossBookingValue).toBe(0);
    });
  });
});
