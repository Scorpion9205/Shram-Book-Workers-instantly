import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService } from "../services/PaymentService.js";
import { BusinessException } from "../../../core/exceptions/index.js";

describe("PaymentService — completion payment link (Razorpay Payment Link shown as a QR after the work is done)", () => {
  let paymentRepoMock: any;
  let bookingRepoMock: any;
  let bookingStateServiceMock: any;
  let paymentProviderMock: any;
  let prismaMock: any;
  let service: PaymentService;

  const completedBooking = {
    id: "booking_abcdef12",
    providerId: "provider_1",
    agentId: null,
    status: "WORK_COMPLETED",
    amount: 500,
    worker: { userId: "worker_user_1" },
  };

  beforeEach(() => {
    paymentRepoMock = {
      findByBookingId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "payment_1" }),
      findByOrderId: vi.fn(),
      markCompletedIfPending: vi.fn().mockResolvedValue(1),
      markRefundedIfCompleted: vi.fn(),
    };
    bookingRepoMock = { findById: vi.fn().mockResolvedValue(completedBooking), update: vi.fn() };
    bookingStateServiceMock = { transition: vi.fn() };
    paymentProviderMock = {
      createPaymentLink: vi.fn().mockResolvedValue({ id: "plink_new", url: "https://rzp.io/i/new" }),
      fetchPaymentLink: vi.fn(),
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      refundPayment: vi.fn(),
    };
    prismaMock = {
      client: {
        payment: { update: vi.fn() },
        agentProfile: { findUnique: vi.fn().mockResolvedValue(null) },
      },
    };

    service = new PaymentService(paymentRepoMock, bookingRepoMock, bookingStateServiceMock, paymentProviderMock, prismaMock);
  });

  describe("createCompletionPayment", () => {
    it("creates a link for the exact booking amount and remembers it on the payment", async () => {
      const result = await service.createCompletionPayment("booking_abcdef12", "worker_user_1");

      expect(paymentProviderMock.createPaymentLink).toHaveBeenCalledWith(500, "booking_abcdef12", expect.stringContaining("BOOKING_"));
      expect(paymentRepoMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ bookingId: "booking_abcdef12", amount: 500, razorpayOrderId: "plink_new" }),
      );
      expect(result).toEqual({ linkId: "plink_new", url: "https://rzp.io/i/new", amount: 500 });
    });

    it("shows the same link again while it is still unpaid", async () => {
      paymentRepoMock.findByBookingId.mockResolvedValue({ id: "payment_1", status: "PENDING", razorpayOrderId: "plink_old" });
      paymentProviderMock.fetchPaymentLink.mockResolvedValue({ id: "plink_old", url: "https://rzp.io/i/old", status: "created" });

      const result = await service.createCompletionPayment("booking_abcdef12", "worker_user_1");

      expect(result.linkId).toBe("plink_old");
      expect(paymentProviderMock.createPaymentLink).not.toHaveBeenCalled();
    });

    it("makes a fresh link when the old one is no longer open", async () => {
      paymentRepoMock.findByBookingId.mockResolvedValue({ id: "payment_1", status: "PENDING", razorpayOrderId: "plink_old" });
      paymentProviderMock.fetchPaymentLink.mockResolvedValue({ id: "plink_old", url: "x", status: "expired" });

      const result = await service.createCompletionPayment("booking_abcdef12", "worker_user_1");

      expect(result.linkId).toBe("plink_new");
      expect(prismaMock.client.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ razorpayOrderId: "plink_new" }) }),
      );
    });

    it("lets the agent who manages the booking ask for the link", async () => {
      bookingRepoMock.findById.mockResolvedValue({ ...completedBooking, agentId: "agent_1" });
      prismaMock.client.agentProfile.findUnique.mockResolvedValue({ id: "agent_1" });

      await expect(service.createCompletionPayment("booking_abcdef12", "agent_user_1")).resolves.toBeDefined();
    });

    it("rejects someone who isn't the worker or their agent", async () => {
      await expect(service.createCompletionPayment("booking_abcdef12", "stranger")).rejects.toThrow(BusinessException);
      expect(paymentProviderMock.createPaymentLink).not.toHaveBeenCalled();
    });

    it("rejects before the work is completed", async () => {
      bookingRepoMock.findById.mockResolvedValue({ ...completedBooking, status: "WORK_STARTED" });

      await expect(service.createCompletionPayment("booking_abcdef12", "worker_user_1")).rejects.toThrow(BusinessException);
    });

    it("rejects when the payment is already completed", async () => {
      paymentRepoMock.findByBookingId.mockResolvedValue({ id: "payment_1", status: "COMPLETED" });

      await expect(service.createCompletionPayment("booking_abcdef12", "worker_user_1")).rejects.toThrow(BusinessException);
    });
  });

  describe("handleWebhook — payment_link.paid", () => {
    const linkEvent = {
      event: "payment_link.paid",
      payload: { payment_link: { entity: { id: "plink_new" } }, payment: { entity: { id: "pay_123" } } },
    };

    it("settles the booking as an online payment when the link is paid", async () => {
      paymentRepoMock.findByOrderId.mockResolvedValue({ id: "payment_1", bookingId: "booking_abcdef12", amount: 500 });

      await service.handleWebhook("raw", linkEvent, "sig");

      expect(paymentRepoMock.findByOrderId).toHaveBeenCalledWith("plink_new");
      expect(paymentRepoMock.markCompletedIfPending).toHaveBeenCalledWith("payment_1", "pay_123", "sig");
      // The mode is switched before the status moves, so the wallet consumer sees ONLINE.
      expect(bookingRepoMock.update).toHaveBeenCalledWith("booking_abcdef12", expect.objectContaining({ paymentMode: "ONLINE" }));
      expect(bookingStateServiceMock.transition).toHaveBeenCalledWith("booking_abcdef12", "PAYMENT_SETTLED", expect.any(Object));
    });

    it("ignores a duplicate delivery (payment already completed)", async () => {
      paymentRepoMock.findByOrderId.mockResolvedValue({ id: "payment_1", bookingId: "booking_abcdef12", amount: 500 });
      paymentRepoMock.markCompletedIfPending.mockResolvedValue(0);

      await service.handleWebhook("raw", linkEvent, "sig");

      expect(bookingStateServiceMock.transition).not.toHaveBeenCalled();
    });

    it("refunds the provider if the booking can't be settled (e.g. already marked as cash received)", async () => {
      paymentRepoMock.findByOrderId
        .mockResolvedValueOnce({ id: "payment_1", bookingId: "booking_abcdef12", amount: 500 });
      paymentRepoMock.findByBookingId.mockResolvedValue({
        id: "payment_1", status: "COMPLETED", razorpayPaymentId: "pay_123", amount: 500,
      });
      bookingStateServiceMock.transition.mockRejectedValue(new Error("invalid transition"));

      await service.handleWebhook("raw", linkEvent, "sig");

      expect(paymentProviderMock.refundPayment).toHaveBeenCalledWith("pay_123", 500);
    });

    it("rejects a webhook with a bad signature", async () => {
      paymentProviderMock.verifyWebhookSignature.mockReturnValue(false);

      await expect(service.handleWebhook("raw", linkEvent, "bad")).rejects.toThrow(BusinessException);
    });
  });
});
