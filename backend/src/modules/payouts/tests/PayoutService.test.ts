import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeRatesService } from "../../../tests/factories/fakeRatesService.js";
import { PayoutService } from "../services/PayoutService.js";
import { BusinessException, NotFoundException } from "../../../core/exceptions/index.js";

describe("PayoutService", () => {
  let payoutRepoMock: any;
  let agentRepoMock: any;
  let service: PayoutService;

  const upi = { method: "UPI" as const, upiId: "ram@upi" };
  const booking = (over: any = {}) => ({
    id: "b1", workerId: "w1", paymentMode: "ONLINE", amount: 1000, finalFare: null, completedAt: new Date(), payoutPaidAt: null,
    workerFundsRequestId: null, workerFundsReleasedAt: null, commissionRequestId: null, commissionCheckedOutAt: null,
    ...over,
  });

  beforeEach(() => {
    payoutRepoMock = {
      createWorkerWithdrawal: vi.fn().mockResolvedValue({ id: "req_1" }),
      createAgentRequest: vi.fn().mockResolvedValue({ id: "req_2" }),
      findAgentSettledBookings: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      listByUser: vi.fn(),
      list: vi.fn(),
      markPaid: vi.fn(),
      reject: vi.fn(),
      totals: vi.fn().mockResolvedValue([]),
    };
    agentRepoMock = { findByUserId: vi.fn().mockResolvedValue({ id: "agent_1" }) };
    service = new PayoutService(payoutRepoMock, agentRepoMock, fakeRatesService());
  });

  describe("requestWorkerWithdrawal", () => {
    it("passes a valid withdrawal to the repository", async () => {
      await service.requestWorkerWithdrawal("user_1", 500, upi);
      expect(payoutRepoMock.createWorkerWithdrawal).toHaveBeenCalledWith("user_1", 500, upi);
    });

    it("rejects an amount below the minimum", async () => {
      await expect(service.requestWorkerWithdrawal("user_1", 50, upi)).rejects.toThrow(BusinessException);
      expect(payoutRepoMock.createWorkerWithdrawal).not.toHaveBeenCalled();
    });
  });

  describe("agent summary and requests (₹1000 bookings, 15% platform, 3% agent)", () => {
    it("splits unclaimed, requested and released money correctly", async () => {
      payoutRepoMock.findAgentSettledBookings.mockResolvedValue([
        booking({ id: "new" }),                                                            // unclaimed
        booking({ id: "asked", workerFundsRequestId: "r1", commissionRequestId: "r2" }),    // waiting for admin
        booking({ id: "released", workerFundsRequestId: "r1", workerFundsReleasedAt: new Date(), commissionRequestId: "r2", commissionCheckedOutAt: new Date() }),
        booking({ id: "handed", workerFundsRequestId: "r1", workerFundsReleasedAt: new Date(), payoutPaidAt: new Date() }),
      ]);

      const summary = await service.getAgentSummary("agent_user");

      expect(summary.rates).toEqual({ fixedFee: 10, servicePercent: 10, agentPercent: 3 });
      expect(summary.commission).toMatchObject({ availableAmount: 60, availableBookingCount: 2, requestedAmount: 30, paidAmount: 30 });
      expect(summary.workerFunds).toMatchObject({
        availableAmount: 850, availableBookingCount: 1, requestedAmount: 850, releasedAmount: 1700, toDistributeAmount: 850,
      });
    });

    it("requests the agent's own commission across all unclaimed bookings", async () => {
      payoutRepoMock.findAgentSettledBookings.mockResolvedValue([
        booking({ id: "a", amount: 2000 }), booking({ id: "b", amount: 2000 }), booking({ id: "c", amount: 2000 }),
        booking({ id: "claimed", amount: 2000, commissionRequestId: "r" }),
      ]);

      await service.requestAgentCommission("agent_user", upi);

      // 3% of 6000 = 180, only the three unclaimed bookings
      expect(payoutRepoMock.createAgentRequest).toHaveBeenCalledWith("AGENT_COMMISSION", "agent_user", 180, upi, ["a", "b", "c"], { bookingIds: [], amount: 0 });
    });

    it("requests the workers' lump sum (85% of each unclaimed booking) in one go", async () => {
      payoutRepoMock.findAgentSettledBookings.mockResolvedValue([booking({ id: "a" }), booking({ id: "b" })]);

      await service.requestAgentWorkerFunds("agent_user", upi);

      expect(payoutRepoMock.createAgentRequest).toHaveBeenCalledWith("AGENT_WORKER_FUNDS", "agent_user", 1700, upi, ["a", "b"], { bookingIds: [], amount: 0 });
    });

    it("never pays out a cash booking to the workers (the agent already holds that money)", async () => {
      payoutRepoMock.findAgentSettledBookings.mockResolvedValue([
        booking({ id: "online", amount: 2000 }),
        booking({ id: "cash", amount: 2000, paymentMode: "OFFLINE" }), // not claimable; owes platform 240
      ]);

      await service.requestAgentWorkerFunds("agent_user", upi);

      // Only the online booking is claimed: 1700, minus the 240 cash dues = 1460
      expect(payoutRepoMock.createAgentRequest).toHaveBeenCalledWith(
        "AGENT_WORKER_FUNDS", "agent_user", 1460, upi, ["online"], { bookingIds: ["cash"], amount: 240 },
      );
    });

    it("takes the platform share of the agent's cash bookings off the workers payout", async () => {
      payoutRepoMock.findAgentSettledBookings.mockResolvedValue([
        booking({ id: "a" }),
        booking({ id: "b" }),
        booking({ id: "cash", paymentMode: "OFFLINE" }), // agent kept the 1000 cash: owes platform 120
      ]);

      await service.requestAgentWorkerFunds("agent_user", upi);

      // 1700 owed to workers - 120 cash dues = 1580 for admin to pay
      expect(payoutRepoMock.createAgentRequest).toHaveBeenCalledWith(
        "AGENT_WORKER_FUNDS", "agent_user", 1580, upi, ["a", "b"], { bookingIds: ["cash"], amount: 120 },
      );
    });

    it("never nets more dues than the payout itself, and leaves the rest for next time", async () => {
      payoutRepoMock.findAgentSettledBookings.mockResolvedValue([
        booking({ id: "online" }), // 850 payout
        ...Array.from({ length: 10 }, (_, i) => booking({ id: "cash" + i, paymentMode: "OFFLINE" })), // 120 dues each
      ]);

      await service.requestAgentWorkerFunds("agent_user", upi);

      const [, , amount, , , dues] = payoutRepoMock.createAgentRequest.mock.calls[0];
      expect(dues.bookingIds).toHaveLength(7); // 7 x 120 = 840 fits in 850, the 8th does not
      expect(amount).toBe(10);
    });

    it("does not count cash dues that are already settled or already netted", async () => {
      payoutRepoMock.findAgentSettledBookings.mockResolvedValue([
        booking({ id: "online" }),
        booking({ id: "old", paymentMode: "OFFLINE", platformDueSettledAt: new Date() }),
        booking({ id: "netted", paymentMode: "OFFLINE", duesRequestId: "r9" }),
      ]);

      const summary = await service.getAgentSummary("agent_user");

      expect(summary.cashDues).toEqual({ amount: 0, bookingCount: 0 });
    });

    it("refuses when less than the minimum is available", async () => {
      payoutRepoMock.findAgentSettledBookings.mockResolvedValue([booking({ id: "tiny", amount: 100 })]); // 3% = 3

      await expect(service.requestAgentCommission("agent_user", upi)).rejects.toThrow(BusinessException);
      expect(payoutRepoMock.createAgentRequest).not.toHaveBeenCalled();
    });

    it("pays the worker their frozen work charge, whatever the current admin rates are", async () => {
      // admin has since changed the rates, but this booking froze its own split when it was created
      service = new PayoutService(payoutRepoMock, agentRepoMock, fakeRatesService({ fixedFee: 50, servicePercent: 30 }));
      payoutRepoMock.findAgentSettledBookings.mockResolvedValue([
        booking({ id: "a", amount: 1000, workAmount: 880, agentAmount: 24 }),
      ]);

      await service.requestAgentWorkerFunds("agent_user", upi);

      expect(payoutRepoMock.createAgentRequest).toHaveBeenCalledWith("AGENT_WORKER_FUNDS", "agent_user", 880, upi, ["a"], { bookingIds: [], amount: 0 });
    });

    it("404s when the caller has no agent profile", async () => {
      agentRepoMock.findByUserId.mockResolvedValue(null);
      await expect(service.getAgentSummary("nobody")).rejects.toThrow(NotFoundException);
    });
  });

  describe("admin actions", () => {
    it("marks a pending request paid", async () => {
      payoutRepoMock.markPaid.mockResolvedValue({ id: "req_1", status: "PAID" });
      const result = await service.markPaid("admin_1", "req_1", "UTR123");
      expect(payoutRepoMock.markPaid).toHaveBeenCalledWith("req_1", "admin_1", "UTR123");
      expect(result.status).toBe("PAID");
    });

    it("explains when the request was already processed", async () => {
      payoutRepoMock.markPaid.mockResolvedValue(null);
      payoutRepoMock.findById.mockResolvedValue({ id: "req_1", status: "PAID" });
      await expect(service.markPaid("admin_1", "req_1", "UTR123")).rejects.toThrow(/already paid/);
    });

    it("404s for an unknown request", async () => {
      payoutRepoMock.reject.mockResolvedValue(null);
      payoutRepoMock.findById.mockResolvedValue(null);
      await expect(service.reject("admin_1", "nope", "wrong details")).rejects.toThrow(NotFoundException);
    });

    it("summarises pending and paid amounts by kind", async () => {
      payoutRepoMock.totals.mockResolvedValue([
        { kind: "WORKER_WALLET", status: "PENDING", count: 2, amount: 700 },
        { kind: "AGENT_COMMISSION", status: "PAID", count: 1, amount: 90 },
      ]);

      const summary = await service.getPlatformSummary();

      expect(summary.pending).toEqual({ count: 2, amount: 700 });
      expect(summary.paid).toEqual({ count: 1, amount: 90 });
    });
  });
});
