import { describe, it, expect, vi, beforeEach } from "vitest";
import { WalletConsumer } from "../consumers/WalletConsumer.js";

describe("WalletConsumer — commission rate", () => {
  let channelMock: any;
  let walletServiceMock: any;
  let bookingRepoMock: any;
  let bookingStateServiceMock: any;
  let platformSettingRepoMock: any;
  let cacheMock: any;
  let consumer: WalletConsumer;

  const onlineBooking = { id: "booking_1", workerId: "worker_1", amount: 1000, paymentMode: "ONLINE" };
  const offlineBooking = { id: "booking_2", workerId: "worker_1", amount: 1000, paymentMode: "OFFLINE" };

  beforeEach(() => {
    channelMock = { prefetch: vi.fn(), consume: vi.fn() };
    walletServiceMock = { creditWallet: vi.fn(), debitWallet: vi.fn() };
    bookingRepoMock = { findById: vi.fn(), update: vi.fn() };
    bookingStateServiceMock = { transition: vi.fn() };
    platformSettingRepoMock = { get: vi.fn() };
    cacheMock = { get: vi.fn().mockResolvedValue(null), set: vi.fn() };

    consumer = new WalletConsumer(
      channelMock,
      walletServiceMock,
      bookingRepoMock,
      bookingStateServiceMock,
      platformSettingRepoMock,
      cacheMock,
    );
  });

  async function dispatchPaymentSettled(booking: any) {
    const payload = { toStatus: "PAYMENT_SETTLED", bookingId: booking.id };
    bookingRepoMock.findById.mockResolvedValue(booking);
    // handleEvent is private; dispatch through the same code path start() wires up.
    await (consumer as any).handleEvent("booking.status_changed", payload);
  }

  it("credits the worker using the platform's configured commission rate, not a hardcoded one", async () => {
    platformSettingRepoMock.get.mockResolvedValue({ value: 20 });

    await dispatchPaymentSettled(onlineBooking);

    // 1000 * (1 - 20/100) = 800 — must match whatever FareCalculator charged the provider at,
    // not a hardcoded 10%.
    expect(walletServiceMock.creditWallet).toHaveBeenCalledWith("worker_1", 800, "BOOKING_PAYMENT", "booking_1");
  });

  it("falls back to the 15% platform default (matching FareCalculator) when no setting exists", async () => {
    platformSettingRepoMock.get.mockResolvedValue(null);

    await dispatchPaymentSettled(onlineBooking);

    expect(walletServiceMock.creditWallet).toHaveBeenCalledWith("worker_1", 850, "BOOKING_PAYMENT", "booking_1");
  });

  it("debits the same configured commission rate for an offline booking", async () => {
    platformSettingRepoMock.get.mockResolvedValue({ value: 20 });

    await dispatchPaymentSettled(offlineBooking);

    expect(walletServiceMock.debitWallet).toHaveBeenCalledWith("worker_1", 200, "COMMISSION_DEDUCTION", "booking_2", true);
  });

  it("caches the commission rate so repeated events don't hit the DB every time", async () => {
    platformSettingRepoMock.get.mockResolvedValue({ value: 25 });

    await dispatchPaymentSettled(onlineBooking);

    expect(cacheMock.set).toHaveBeenCalledWith(expect.any(String), 25, 60);
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
});
