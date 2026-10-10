import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService } from "../services/PaymentService.js";
import { BusinessException } from "../../../core/exceptions/index.js";

describe("PaymentService.createOrder — abandoned-checkout retry", () => {
  let paymentRepoMock: any;
  let bookingRepoMock: any;
  let bookingStateServiceMock: any;
  let paymentProviderMock: any;
  let prismaMock: any;
  let service: PaymentService;

  const createdBooking = { id: "booking_1", providerId: "provider_1", status: "CREATED", amount: 500 };
  const pendingBooking = { ...createdBooking, status: "PAYMENT_PENDING" };

  beforeEach(() => {
    paymentRepoMock = { findByBookingId: vi.fn().mockResolvedValue(null), create: vi.fn() };
    bookingRepoMock = { findById: vi.fn() };
    bookingStateServiceMock = { transition: vi.fn() };
    paymentProviderMock = {
      createRazorpayOrder: vi.fn().mockResolvedValue({ id: "order_new", amount: 50000, currency: "INR" }),
    };
    prismaMock = { client: { payment: { update: vi.fn() } } };

    service = new PaymentService(paymentRepoMock, bookingRepoMock, bookingStateServiceMock, paymentProviderMock, prismaMock);
  });

  it("transitions CREATED -> PAYMENT_PENDING on the first order attempt", async () => {
    bookingRepoMock.findById.mockResolvedValue(createdBooking);
    paymentRepoMock.create.mockResolvedValue({ id: "payment_1" });

    await service.createOrder("booking_1", "provider_1");

    expect(bookingStateServiceMock.transition).toHaveBeenCalledWith(
      "booking_1",
      "PAYMENT_PENDING",
      expect.any(Object),
    );
  });

  it("allows retrying a new order when the booking is already PAYMENT_PENDING (abandoned checkout), without re-transitioning", async () => {
    bookingRepoMock.findById.mockResolvedValue(pendingBooking);
    paymentRepoMock.findByBookingId.mockResolvedValue({ id: "payment_1", status: "PENDING" });
    prismaMock.client.payment.update.mockResolvedValue({ id: "payment_1" });

    const result = await service.createOrder("booking_1", "provider_1");

    expect(paymentProviderMock.createRazorpayOrder).toHaveBeenCalled();
    expect(result.orderId).toBe("order_new");
    // Already PAYMENT_PENDING -> PAYMENT_PENDING isn't a valid FSM edge; must not attempt it.
    expect(bookingStateServiceMock.transition).not.toHaveBeenCalled();
  });

  it("still rejects creating an order once the booking has moved past the payment stage", async () => {
    bookingRepoMock.findById.mockResolvedValue({ ...createdBooking, status: "WORKER_ASSIGNED" });

    await expect(service.createOrder("booking_1", "provider_1")).rejects.toThrow(BusinessException);
  });

  it("still rejects if the payment was already completed, even while retry-eligible by status", async () => {
    bookingRepoMock.findById.mockResolvedValue(pendingBooking);
    paymentRepoMock.findByBookingId.mockResolvedValue({ id: "payment_1", status: "COMPLETED" });

    await expect(service.createOrder("booking_1", "provider_1")).rejects.toThrow(BusinessException);
  });
});
