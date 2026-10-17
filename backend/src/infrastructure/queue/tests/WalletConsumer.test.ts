import { describe, it, expect, vi, beforeEach } from "vitest";
import { WalletConsumer } from "../consumers/WalletConsumer.js";

describe("WalletConsumer — worker earnings and platform share", () => {
  let channelMock: any;
  let walletServiceMock: any;
  let bookingRepoMock: any;
  let bookingStateServiceMock: any;
  let consumer: WalletConsumer;

  const onlineBooking = { id: "booking_1", workerId: "worker_1", amount: 1000, workAmount: 880, agentAmount: 0, finalFare: null, paymentMode: "ONLINE" };
  const offlineBooking = { id: "booking_2", workerId: "worker_1", amount: 1000, workAmount: 880, agentAmount: 0, finalFare: null, paymentMode: "OFFLINE" };

  beforeEach(() => {
    channelMock = { prefetch: vi.fn(), consume: vi.fn() };
    walletServiceMock = { creditWallet: vi.fn(), debitWallet: vi.fn() };
    bookingRepoMock = { findById: vi.fn(), update: vi.fn() };
    bookingStateServiceMock = { transition: vi.fn() };

    consumer = new WalletConsumer(
      channelMock,
      walletServiceMock,
      bookingRepoMock,
      bookingStateServiceMock,
    );
  });

  async function dispatchPaymentSettled(booking: any) {
    const payload = { toStatus: "PAYMENT_SETTLED", bookingId: booking.id };
    bookingRepoMock.findById.mockResolvedValue(booking);
    // handleEvent is private; dispatch through the same code path start() wires up.
    await (consumer as any).handleEvent("booking.status_changed", payload);
  }

  it("credits the worker their whole work charge for an online booking", async () => {
    await dispatchPaymentSettled(onlineBooking);

    // The provider paid 1000, the worker's work charge was 880 - they get all of it, no commission cut.
    expect(walletServiceMock.creditWallet).toHaveBeenCalledWith("worker_1", 880, "BOOKING_PAYMENT", "booking_1");
  });

  it("debits the platform's part (what the worker kept in cash beyond their work charge) for an offline booking", async () => {
    await dispatchPaymentSettled(offlineBooking);

    expect(walletServiceMock.debitWallet).toHaveBeenCalledWith("worker_1", 120, "COMMISSION_DEDUCTION", "booking_2", true);
  });

  it("uses the old 85/15 split for bookings made before the fixed-fee pricing (no stored work amount)", async () => {
    await dispatchPaymentSettled({ ...onlineBooking, workAmount: null, agentAmount: null });

    expect(walletServiceMock.creditWallet).toHaveBeenCalledWith("worker_1", 850, "BOOKING_PAYMENT", "booking_1");
  });

  describe("WORK_COMPLETED auto-settle (ONLINE bookings)", () => {
    it("persists finalFare when auto-settling — this path bypasses BookingService.settlePayment, the only other place that sets it", async () => {
      bookingRepoMock.findById.mockResolvedValue(onlineBooking);

      await (consumer as any).handleEvent("booking.status_changed", {
        toStatus: "WORK_COMPLETED",
        bookingId: "booking_1",
      });

      expect(bookingStateServiceMock.transition).toHaveBeenCalledWith(
        "booking_1",
        "PAYMENT_SETTLED",
        expect.any(Object),
      );
      expect(bookingRepoMock.update).toHaveBeenCalledWith("booking_1", { finalFare: 1000 });
    });

    it("does not touch finalFare for an OFFLINE booking — that's settled manually by the worker instead", async () => {
      bookingRepoMock.findById.mockResolvedValue(offlineBooking);

      await (consumer as any).handleEvent("booking.status_changed", {
        toStatus: "WORK_COMPLETED",
        bookingId: "booking_2",
      });

      expect(bookingStateServiceMock.transition).not.toHaveBeenCalled();
      expect(bookingRepoMock.update).not.toHaveBeenCalled();
    });
  });

  describe("agent-managed bookings skip the wallet entirely", () => {
    // Agent-managed workers have no login, so there's no wallet for them to ever see or
    // withdraw from. The Agent settles what's owed manually instead (Booking.payoutPaidAt) —
    // the wallet should never be touched for either payment mode.
    it("does not credit/debit any wallet for an ONLINE agent-sourced booking", async () => {
      await dispatchPaymentSettled({ ...onlineBooking, agentId: "agent_1" });

      expect(walletServiceMock.creditWallet).not.toHaveBeenCalled();
      expect(walletServiceMock.debitWallet).not.toHaveBeenCalled();
    });

    it("does not credit/debit any wallet for an OFFLINE agent-sourced booking", async () => {
      await dispatchPaymentSettled({ ...offlineBooking, agentId: "agent_1" });

      expect(walletServiceMock.creditWallet).not.toHaveBeenCalled();
      expect(walletServiceMock.debitWallet).not.toHaveBeenCalled();
    });
  });
});
