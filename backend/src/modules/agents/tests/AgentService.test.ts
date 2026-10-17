import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentService } from "../services/AgentService.js";
import { NotFoundException, BusinessException } from "../../../core/exceptions/index.js";

describe("AgentService", () => {
  let agentRepoMock: any;
  let agentWorkerRepoMock: any;
  let platformSettingRepoMock: any;
  let cacheMock: any;
  let workerServiceMock: any;
  let locationServiceMock: any;
  let userServiceMock: any;
  let applicationServiceMock: any;
  let instantRequestServiceMock: any;
  let service: AgentService;

  const agent = { id: "agent_1", userId: "user_1", agencyName: "Acme Staffing" };
  const link = { id: "link_1", agentId: "agent_1", workerId: "worker_1", verifiedByAgent: false, worker: { userId: "worker_user_1" } };

  beforeEach(() => {
    agentRepoMock = {
      findByUserId: vi.fn().mockResolvedValue(agent),
      findCommissionableBookings: vi.fn(),
      findWorkerEarnings: vi.fn(),
      markWorkerBookingsPaid: vi.fn(),
    };
    agentWorkerRepoMock = {
      createManagedWorker: vi.fn(),
      findManyByAgentId: vi.fn(),
      findLinkByAgentAndWorker: vi.fn().mockResolvedValue(link),
      setVerified: vi.fn(),
      deleteLink: vi.fn(),
      setWorkerBankDetails: vi.fn(),
    };
    platformSettingRepoMock = { get: vi.fn() };
    cacheMock = { get: vi.fn().mockResolvedValue(null), set: vi.fn() };
    workerServiceMock = { updateAvailability: vi.fn() };
    locationServiceMock = { updateLocation: vi.fn() };
    userServiceMock = { deleteAccount: vi.fn() };
    applicationServiceMock = { assignWorkerToApplication: vi.fn() };
    instantRequestServiceMock = { getOpenRequestsForSkills: vi.fn(), assignWorkerToItem: vi.fn() };

    service = new AgentService(
      agentRepoMock,
      agentWorkerRepoMock,
      {} as any, // prisma
      platformSettingRepoMock,
      cacheMock,
      workerServiceMock,
      locationServiceMock,
      userServiceMock,
      applicationServiceMock,
      instantRequestServiceMock,
    );
  });

  describe("getCommissionSummary", () => {
    it("throws NotFoundException when the agent profile doesn't exist", async () => {
      agentRepoMock.findByUserId.mockResolvedValue(null);
      await expect(service.getCommissionSummary("user_1")).rejects.toThrow(NotFoundException);
    });

    it("uses the agent cut frozen on each booking, falling back to the old 3% rule for old bookings", async () => {
      agentRepoMock.findByUserId.mockResolvedValue(agent);
      platformSettingRepoMock.get.mockResolvedValue({ value: 5 });
      agentRepoMock.findCommissionableBookings.mockResolvedValue([
        // new pricing: the agent cut (24) was frozen when the booking was created
        { id: "booking_1", amount: 1000, finalFare: 800, workAmount: 700, agentAmount: 24, completedAt: new Date("2026-01-01"), commissionCheckedOutAt: null },
        // old booking with no stored split: 3% of 500 = 15
        { id: "booking_2", amount: 500, finalFare: null, workAmount: null, agentAmount: null, completedAt: new Date("2026-01-02"), commissionCheckedOutAt: null },
      ]);

      const result = await service.getCommissionSummary("user_1");

      expect(result.commissionPercent).toBe(5); // the setting, for display
      expect(result.bookingCount).toBe(2);
      expect(result.totalGrossBookingValue).toBe(1300);
      expect(result.totalEarnings).toBe(39);
      expect(result.recentCommissions[0]).toMatchObject({ bookingId: "booking_1", grossAmount: 800, commission: 24 });
      expect(result.recentCommissions[1]).toMatchObject({ bookingId: "booking_2", commission: 15 });
    });

    it("shows the default agent rate when no platform setting exists", async () => {
      agentRepoMock.findByUserId.mockResolvedValue(agent);
      platformSettingRepoMock.get.mockResolvedValue(null);
      agentRepoMock.findCommissionableBookings.mockResolvedValue([
        { id: "booking_1", amount: 1000, finalFare: null, workAmount: null, agentAmount: null, completedAt: null, commissionCheckedOutAt: null },
      ]);

      const result = await service.getCommissionSummary("user_1");

      expect(result.commissionPercent).toBe(3); // DEFAULT_AGENT_COMMISSION_PERCENT
      expect(result.totalEarnings).toBe(30);
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

    it("buckets commission into today/this-month/all-time for the dashboard dropdown", async () => {
      agentRepoMock.findByUserId.mockResolvedValue(agent);
      platformSettingRepoMock.get.mockResolvedValue({ value: 10 });

      const now = new Date();
      const earlierToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 0, 0);
      const earlierThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 1, 0, 0);
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);

      agentRepoMock.findCommissionableBookings.mockResolvedValue([
        { id: "booking_today", amount: 100, finalFare: null, workAmount: 0, agentAmount: 10, completedAt: earlierToday, commissionCheckedOutAt: null }, // commission 10
        { id: "booking_this_month", amount: 200, finalFare: null, workAmount: 0, agentAmount: 20, completedAt: earlierThisMonth, commissionCheckedOutAt: null }, // commission 20
        { id: "booking_last_year", amount: 300, finalFare: null, workAmount: 0, agentAmount: 30, completedAt: lastYear, commissionCheckedOutAt: null }, // commission 30
      ]);

      const result = await service.getCommissionSummary("user_1");

      expect(result.totalEarnings).toBe(60);
      // "today" bucket only includes the booking completed earlier today
      expect(result.todayEarnings).toBe(10);
      // "this month" bucket includes today's + earlier-this-month's, not last year's
      expect(result.monthEarnings).toBe(30);
    });

    it("excludes already-checked-out bookings from pendingCheckoutAmount but keeps them in totalEarnings", async () => {
      agentRepoMock.findByUserId.mockResolvedValue(agent);
      platformSettingRepoMock.get.mockResolvedValue({ value: 10 });
      agentRepoMock.findCommissionableBookings.mockResolvedValue([
        { id: "booking_1", amount: 1000, finalFare: null, workAmount: 0, agentAmount: 100, completedAt: new Date(), commissionCheckedOutAt: new Date() }, // already claimed, commission 100
        { id: "booking_2", amount: 2000, finalFare: null, workAmount: 0, agentAmount: 200, completedAt: new Date(), commissionCheckedOutAt: null }, // still pending, commission 200
      ]);

      const result = await service.getCommissionSummary("user_1");

      expect(result.totalEarnings).toBe(300); // lifetime total includes both
      expect(result.pendingCheckoutAmount).toBe(200); // only the unclaimed one
    });
  });

  describe("createManagedWorker", () => {
    it("resolves the caller's AgentProfile and delegates creation to the repository", async () => {
      const data = { name: "Ramesh", phone: null, skillIds: ["skill_1"], dailyRate: 500 };
      agentWorkerRepoMock.createManagedWorker.mockResolvedValue({ id: "link_1" });

      await service.createManagedWorker("user_1", data as any);

      expect(agentRepoMock.findByUserId).toHaveBeenCalledWith("user_1");
      expect(agentWorkerRepoMock.createManagedWorker).toHaveBeenCalledWith("agent_1", data);
    });
  });

  describe("setWorkerAvailability", () => {
    it("404s when the worker isn't on this agent's roster", async () => {
      agentWorkerRepoMock.findLinkByAgentAndWorker.mockResolvedValue(null);
      await expect(service.setWorkerAvailability("user_1", "worker_1", true)).rejects.toThrow(NotFoundException);
      expect(workerServiceMock.updateAvailability).not.toHaveBeenCalled();
    });

    it("sets the worker's location before toggling availability when a location is given", async () => {
      await service.setWorkerAvailability("user_1", "worker_1", true, { latitude: 12.9, longitude: 77.5 });

      expect(locationServiceMock.updateLocation).toHaveBeenCalledWith("worker_user_1", { latitude: 12.9, longitude: 77.5 });
      expect(workerServiceMock.updateAvailability).toHaveBeenCalledWith("worker_user_1", true);
    });

    it("skips the location update when none is given", async () => {
      await service.setWorkerAvailability("user_1", "worker_1", false);

      expect(locationServiceMock.updateLocation).not.toHaveBeenCalled();
      expect(workerServiceMock.updateAvailability).toHaveBeenCalledWith("worker_user_1", false);
    });
  });

  describe("setWorkerVerified", () => {
    it("404s when the worker isn't on this agent's roster", async () => {
      agentWorkerRepoMock.findLinkByAgentAndWorker.mockResolvedValue(null);
      await expect(service.setWorkerVerified("user_1", "worker_1", true)).rejects.toThrow(NotFoundException);
      expect(agentWorkerRepoMock.setVerified).not.toHaveBeenCalled();
    });

    it("sets the agent-scoped trust flag via the repository", async () => {
      agentWorkerRepoMock.setVerified.mockResolvedValue({ id: "link_1", verifiedByAgent: true });

      await service.setWorkerVerified("user_1", "worker_1", true);

      expect(agentWorkerRepoMock.setVerified).toHaveBeenCalledWith("agent_1", "worker_1", true);
    });
  });

  describe("removeWorker", () => {
    it("404s when the worker isn't on this agent's roster", async () => {
      agentWorkerRepoMock.findLinkByAgentAndWorker.mockResolvedValue(null);
      await expect(service.removeWorker("user_1", "worker_1")).rejects.toThrow(NotFoundException);
      expect(userServiceMock.deleteAccount).not.toHaveBeenCalled();
    });

    it("soft-deletes the worker's User account, then removes the roster link", async () => {
      await service.removeWorker("user_1", "worker_1");

      expect(userServiceMock.deleteAccount).toHaveBeenCalledWith("worker_user_1");
      expect(agentWorkerRepoMock.deleteLink).toHaveBeenCalledWith("agent_1", "worker_1");
    });
  });

  describe("getWorkerEarnings", () => {
    it("404s when the worker isn't on this agent's roster", async () => {
      agentWorkerRepoMock.findLinkByAgentAndWorker.mockResolvedValue(null);
      await expect(service.getWorkerEarnings("user_1", "worker_1")).rejects.toThrow(NotFoundException);
    });

    it("shows the worker's share (after the 15% platform cut), and what the agent can pay out now", async () => {
      agentRepoMock.findWorkerEarnings.mockResolvedValue({
        totalEarned: 0, totalPaid: 0, totalPending: 0, payableNow: 0,
        bookings: [
          { id: "b1", amount: 1000, finalFare: null, completedAt: null, payoutPaidAt: new Date(), payoutMethod: "CASH", fundsReleased: true }, // paid: 850
          { id: "b2", amount: 1000, finalFare: null, completedAt: null, payoutPaidAt: null, payoutMethod: null, fundsReleased: true },       // payable now: 850
          { id: "b3", amount: 1000, finalFare: null, completedAt: null, payoutPaidAt: null, payoutMethod: null, fundsReleased: false },      // not released yet: 850
        ],
      });

      const result = await service.getWorkerEarnings("user_1", "worker_1");

      expect(agentRepoMock.findWorkerEarnings).toHaveBeenCalledWith("agent_1", "worker_1");
      expect(result.totalEarned).toBe(2550);
      expect(result.totalPaid).toBe(850);
      expect(result.totalPending).toBe(1700);
      expect(result.payableNow).toBe(850);
      expect(result.bookings[0].amount).toBe(850);
    });
  });

  describe("payoutWorker", () => {
    it("404s when the worker isn't on this agent's roster", async () => {
      agentWorkerRepoMock.findLinkByAgentAndWorker.mockResolvedValue(null);
      await expect(service.payoutWorker("user_1", "worker_1", "CASH")).rejects.toThrow(NotFoundException);
    });

    it("marks pending bookings paid via the repository", async () => {
      agentRepoMock.markWorkerBookingsPaid.mockResolvedValue(2);

      await service.payoutWorker("user_1", "worker_1", "BANK_TRANSFER");

      expect(agentRepoMock.markWorkerBookingsPaid).toHaveBeenCalledWith("agent_1", "worker_1", "BANK_TRANSFER");
    });

    it("rejects when there is nothing pending to pay", async () => {
      agentRepoMock.markWorkerBookingsPaid.mockResolvedValue(0);
      await expect(service.payoutWorker("user_1", "worker_1", "CASH")).rejects.toThrow();
    });
  });

  describe("setWorkerBankDetails", () => {
    it("404s when the worker isn't on this agent's roster", async () => {
      agentWorkerRepoMock.findLinkByAgentAndWorker.mockResolvedValue(null);
      await expect(
        service.setWorkerBankDetails("user_1", "worker_1", {
          accountHolderName: "Ramesh",
          accountNumber: "123456",
          ifscCode: "ABCD0123456",
          bankName: "Test Bank",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("delegates to the repository once roster ownership is confirmed", async () => {
      const bankData = { accountHolderName: "Ramesh", accountNumber: "123456", ifscCode: "ABCD0123456", bankName: "Test Bank" };
      agentWorkerRepoMock.setWorkerBankDetails.mockResolvedValue({ id: "link_1" });

      await service.setWorkerBankDetails("user_1", "worker_1", bankData);

      expect(agentWorkerRepoMock.setWorkerBankDetails).toHaveBeenCalledWith("worker_1", bankData);
    });
  });

  describe("assignWorkerToApplication", () => {
    it("404s when the worker isn't on this agent's roster", async () => {
      agentWorkerRepoMock.findLinkByAgentAndWorker.mockResolvedValue(null);
      await expect(service.assignWorkerToApplication("user_1", "app_1", "worker_1")).rejects.toThrow(NotFoundException);
      expect(applicationServiceMock.assignWorkerToApplication).not.toHaveBeenCalled();
    });

    it("delegates to ApplicationService once roster ownership is confirmed", async () => {
      applicationServiceMock.assignWorkerToApplication.mockResolvedValue({ success: true, bookingId: "booking_1" });

      await service.assignWorkerToApplication("user_1", "app_1", "worker_1");

      expect(applicationServiceMock.assignWorkerToApplication).toHaveBeenCalledWith("agent_1", "app_1", "worker_1");
    });
  });

  describe("getOpenInstantRequests", () => {
    it("collects distinct skill ids across the whole roster and delegates to InstantRequestService", async () => {
      agentWorkerRepoMock.findManyByAgentId.mockResolvedValue([
        { worker: { skills: [{ skillId: "skill_a" }, { skillId: "skill_b" }] } },
        { worker: { skills: [{ skillId: "skill_b" }] } }, // duplicate, should be deduped
      ]);
      instantRequestServiceMock.getOpenRequestsForSkills.mockResolvedValue([{ id: "req_1" }]);

      const result = await service.getOpenInstantRequests("user_1");

      expect(instantRequestServiceMock.getOpenRequestsForSkills).toHaveBeenCalledWith(
        expect.arrayContaining(["skill_a", "skill_b"]),
      );
      expect((instantRequestServiceMock.getOpenRequestsForSkills.mock.calls[0][0] as string[]).length).toBe(2);
      expect(result).toEqual([{ id: "req_1" }]);
    });
  });

  describe("assignWorkerToInstantItem", () => {
    it("404s when the worker isn't on this agent's roster", async () => {
      agentWorkerRepoMock.findLinkByAgentAndWorker.mockResolvedValue(null);
      await expect(service.assignWorkerToInstantItem("user_1", "item_1", "worker_1")).rejects.toThrow(NotFoundException);
      expect(instantRequestServiceMock.assignWorkerToItem).not.toHaveBeenCalled();
    });

    it("delegates to InstantRequestService with the worker's userId once roster ownership is confirmed", async () => {
      instantRequestServiceMock.assignWorkerToItem.mockResolvedValue({ bookingId: "booking_1" });

      await service.assignWorkerToInstantItem("user_1", "item_1", "worker_1");

      expect(instantRequestServiceMock.assignWorkerToItem).toHaveBeenCalledWith("agent_1", "item_1", "worker_1", "worker_user_1");
    });
  });
});
