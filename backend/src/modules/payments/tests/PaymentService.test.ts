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

describe("PaymentService.handleWebhook", () => {
  let paymentRepoMock: any;
  let bookingRepoMock: any;
  let bookingStateServiceMock: any;
  let paymentProviderMock: any;
  let prismaMock: any;
  let service: PaymentService;

  const payload = {
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } },
  };

  beforeEach(() => {
    paymentRepoMock = {
      findByOrderId: vi.fn().mockResolvedValue({ id: "payment_1", bookingId: "booking_1", status: "PENDING" }),
      findByBookingId: vi.fn().mockResolvedValue({
        id: "payment_1",
        bookingId: "booking_1",
        status: "COMPLETED",
        razorpayPaymentId: "pay_1",
        amount: 500,
      }),
      markCompletedIfPending: vi.fn().mockResolvedValue(1),
      markRefundedIfCompleted: vi.fn().mockResolvedValue(1),
    };
    bookingRepoMock = {};
    bookingStateServiceMock = { transition: vi.fn() };
    paymentProviderMock = {
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      refundPayment: vi.fn().mockResolvedValue({ id: "rfnd_1", status: "processed" }),
    };
    prismaMock = {};

    service = new PaymentService(paymentRepoMock, bookingRepoMock, bookingStateServiceMock, paymentProviderMock, prismaMock);
  });

  it("confirms payment AND auto-assigns the worker so the booking never gets stuck at PAYMENT_CONFIRMED", async () => {
    await service.handleWebhook("{}", payload, "sig");

    expect(bookingStateServiceMock.transition).toHaveBeenCalledWith(
      "booking_1",
      "PAYMENT_CONFIRMED",
      expect.any(Object),
    );
    expect(bookingStateServiceMock.transition).toHaveBeenCalledWith(
      "booking_1",
      "WORKER_ASSIGNED",
      expect.any(Object),
    );
    expect(bookingStateServiceMock.transition).toHaveBeenCalledTimes(2);
  });

  it("does nothing on a duplicate/retried webhook delivery for an already-completed payment", async () => {
    paymentRepoMock.markCompletedIfPending.mockResolvedValue(0);

    await service.handleWebhook("{}", payload, "sig");

    expect(bookingStateServiceMock.transition).not.toHaveBeenCalled();
  });

  it("rejects a webhook with an invalid signature before touching anything", async () => {
    paymentProviderMock.verifyWebhookSignature.mockReturnValue(false);

    await expect(service.handleWebhook("{}", payload, "bad-sig")).rejects.toThrow(BusinessException);
    expect(paymentRepoMock.findByOrderId).not.toHaveBeenCalled();
  });

  it("refunds the just-captured payment if the booking was cancelled in the window before this webhook arrived", async () => {
    bookingStateServiceMock.transition.mockRejectedValueOnce(new Error("INVALID_BOOKING_TRANSITION"));

    await service.handleWebhook("{}", payload, "sig");

    expect(paymentProviderMock.refundPayment).toHaveBeenCalledWith("pay_1", 500);
    expect(paymentRepoMock.markRefundedIfCompleted).toHaveBeenCalledWith("payment_1");
  });
});

describe("PaymentService.refundForCancelledBooking", () => {
  let paymentRepoMock: any;
  let paymentProviderMock: any;
  let service: PaymentService;

  beforeEach(() => {
    paymentRepoMock = {
      findByBookingId: vi.fn().mockResolvedValue({
        id: "payment_1",
        status: "COMPLETED",
        razorpayPaymentId: "pay_1",
        amount: 500,
      }),
      markRefundedIfCompleted: vi.fn().mockResolvedValue(1),
    };
    paymentProviderMock = { refundPayment: vi.fn().mockResolvedValue({ id: "rfnd_1" }) };

    service = new PaymentService(paymentRepoMock, {} as any, {} as any, paymentProviderMock, {} as any);
  });

  it("issues a Razorpay refund and marks the payment REFUNDED", async () => {
    await service.refundForCancelledBooking("booking_1");

    expect(paymentProviderMock.refundPayment).toHaveBeenCalledWith("pay_1", 500);
    expect(paymentRepoMock.markRefundedIfCompleted).toHaveBeenCalledWith("payment_1");
  });

  it("does nothing when no payment was ever made for this booking", async () => {
    paymentRepoMock.findByBookingId.mockResolvedValue(null);

    await service.refundForCancelledBooking("booking_1");

    expect(paymentProviderMock.refundPayment).not.toHaveBeenCalled();
  });

  it("does nothing when the payment was never completed (still PENDING)", async () => {
    paymentRepoMock.findByBookingId.mockResolvedValue({ id: "payment_1", status: "PENDING", razorpayPaymentId: null, amount: 500 });

    await service.refundForCancelledBooking("booking_1");

    expect(paymentProviderMock.refundPayment).not.toHaveBeenCalled();
  });

  it("does not mark REFUNDED in our DB if the Razorpay refund call itself fails", async () => {
    paymentProviderMock.refundPayment.mockRejectedValue(new Error("Razorpay API down"));

    await expect(service.refundForCancelledBooking("booking_1")).rejects.toThrow("Razorpay API down");
    expect(paymentRepoMock.markRefundedIfCompleted).not.toHaveBeenCalled();
  });
});
