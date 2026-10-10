import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminService } from "../services/AdminService.js";
import { BusinessException } from "../../../core/exceptions/index.js";

describe("AdminService", () => {
  let adminRepoMock: any;
  let pricingRuleRepoMock: any;
  let bookingRepoMock: any;
  let workerRepoMock: any;
  let bookingStateServiceMock: any;
  let service: AdminService;

  beforeEach(() => {
    adminRepoMock = {
      getDashboardCounts: vi.fn(),
      getPlatformAnalyticsData: vi.fn(),
    };
    pricingRuleRepoMock = {
      findAll: vi.fn(),
      upsert: vi.fn(),
    };
    bookingRepoMock = { findById: vi.fn(), update: vi.fn() };
    workerRepoMock = { findById: vi.fn(), markUnavailableIfAvailable: vi.fn() };
    bookingStateServiceMock = { transition: vi.fn() };

    service = new AdminService(
      adminRepoMock,
      {} as any, // cache
      {} as any, // userRepo
      bookingRepoMock,
      {} as any, // platformSettingRepo
      {} as any, // notificationTemplateRepo
      workerRepoMock,
      bookingStateServiceMock,
      pricingRuleRepoMock,
    );
  });

  describe("assignWorker", () => {
    const booking = { id: "booking_1", status: "PAYMENT_CONFIRMED" };
    const worker = { id: "worker_1", isAvailable: true };

    it("claims the worker atomically and transitions the booking when the worker is available", async () => {
      bookingRepoMock.findById.mockResolvedValue(booking);
      workerRepoMock.findById.mockResolvedValue(worker);
      workerRepoMock.markUnavailableIfAvailable.mockResolvedValue(1);
      bookingStateServiceMock.transition.mockResolvedValue({ ...booking, status: "WORKER_ASSIGNED" });

      await service.assignWorker("booking_1", "worker_1", "admin_1");

      expect(workerRepoMock.markUnavailableIfAvailable).toHaveBeenCalledWith("worker_1");
      expect(bookingRepoMock.update).toHaveBeenCalledWith("booking_1", { workerId: "worker_1" });
    });

    it("rejects assignment when the worker was already claimed elsewhere, without touching the booking", async () => {
      bookingRepoMock.findById.mockResolvedValue(booking);
      workerRepoMock.findById.mockResolvedValue(worker);
      workerRepoMock.markUnavailableIfAvailable.mockResolvedValue(0);

      await expect(service.assignWorker("booking_1", "worker_1", "admin_1")).rejects.toThrow(BusinessException);
      expect(bookingRepoMock.update).not.toHaveBeenCalled();
      expect(bookingStateServiceMock.transition).not.toHaveBeenCalled();
    });
  });

  describe("getPlatformAnalytics", () => {
    it("builds day-bucketed trends covering every entry exactly once over a 7-day range", async () => {
      const now = new Date();
      adminRepoMock.getDashboardCounts.mockResolvedValue({
        totalUsers: 10,
        totalWorkers: 5,
        totalProviders: 3,
        totalAgents: 2,
        totalBookings: 20,
        totalJobs: 8,
      });
      adminRepoMock.getPlatformAnalyticsData.mockResolvedValue({
        activeWorkers: 4,
        activeProviders: 2,
        totalRevenue: 5000,
        signups: [{ createdAt: now }, { createdAt: now }],
        bookings: [{ createdAt: now }],
        revenueEntries: [
          { createdAt: now, amount: 1200 },
          { createdAt: now, amount: 300 },
        ],
      });

      const result = await service.getPlatformAnalytics("7days");

      expect(result.totalUsers).toBe(10);
      expect(result.activeWorkers).toBe(4);
      expect(result.totalRevenue).toBe(5000);
      expect(result.signupTrend).toHaveLength(7);
      expect(result.bookingTrend).toHaveLength(7);
      expect(result.revenueTrend).toHaveLength(7);

      expect(result.signupTrend.reduce((sum: number, d: any) => sum + d.value, 0)).toBe(2);
      expect(result.bookingTrend.reduce((sum: number, d: any) => sum + d.value, 0)).toBe(1);
      expect(result.revenueTrend.reduce((sum: number, d: any) => sum + d.value, 0)).toBe(1500);
    });

    it("returns all-zero trends when there's no data in range", async () => {
      adminRepoMock.getDashboardCounts.mockResolvedValue({
        totalUsers: 0,
        totalWorkers: 0,
        totalProviders: 0,
        totalAgents: 0,
        totalBookings: 0,
        totalJobs: 0,
      });
      adminRepoMock.getPlatformAnalyticsData.mockResolvedValue({
        activeWorkers: 0,
        activeProviders: 0,
        totalRevenue: 0,
        signups: [],
        bookings: [],
        revenueEntries: [],
      });

      const result = await service.getPlatformAnalytics();

      expect(result.signupTrend.every((d: any) => d.value === 0)).toBe(true);
      expect(result.totalRevenue).toBe(0);
    });
  });

  describe("pricing rules", () => {
    it("delegates getAllPricingRules to the repository", async () => {
      pricingRuleRepoMock.findAll.mockResolvedValue([{ id: "pr_1" }]);
      await expect(service.getAllPricingRules()).resolves.toEqual([{ id: "pr_1" }]);
    });

    it("delegates upsertPricingRule with only the provided fields", async () => {
      pricingRuleRepoMock.upsert.mockResolvedValue({ id: "pr_1", minFare: 500 });
      await service.upsertPricingRule("skill_1", 500);
      expect(pricingRuleRepoMock.upsert).toHaveBeenCalledWith("skill_1", { minFare: 500 });
    });
  });
});
