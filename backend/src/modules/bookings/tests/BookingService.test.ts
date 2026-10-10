import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingService } from "../services/BookingService.js";
import { BusinessException, NotFoundException } from "../../../core/exceptions/index.js";

describe("BookingService", () => {
  let bookingRepoMock: any;
  let stateServiceMock: any;
  let eventPublisherMock: any;
  let cacheMock: any;
  let jobRepoMock: any;
  let service: BookingService;

  const onlineBooking = { id: "booking_1", providerId: "provider_1", worker: { userId: "worker_1" }, paymentMode: "ONLINE", amount: 500 };
  const offlineBooking = { id: "booking_2", providerId: "provider_1", worker: { userId: "worker_1" }, paymentMode: "OFFLINE", amount: 500 };

  beforeEach(() => {
    bookingRepoMock = { findById: vi.fn(), update: vi.fn(), create: vi.fn() };
    stateServiceMock = { transition: vi.fn() };
    eventPublisherMock = { publish: vi.fn() };
    cacheMock = {};
    jobRepoMock = { findById: vi.fn() };

    service = new BookingService(bookingRepoMock, stateServiceMock, eventPublisherMock, cacheMock, jobRepoMock);
  });

  describe("createBooking", () => {
    const job = { id: "job_1", providerId: "provider_1", budget: 750, status: "OPEN" };

    it("derives amount/estimatedFare from the job's own budget, never a client-supplied value", async () => {
      jobRepoMock.findById.mockResolvedValue(job);
      bookingRepoMock.create.mockResolvedValue({ id: "booking_new" });

      await service.createBooking("provider_1", { jobId: "job_1", type: "NORMAL_JOB" });

      expect(bookingRepoMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: "provider_1", amount: 750, estimatedFare: 750 }),
      );
    });

    it("rejects a provider trying to book a job they don't own", async () => {
      jobRepoMock.findById.mockResolvedValue({ ...job, providerId: "someone_else" });

      await expect(
        service.createBooking("provider_1", { jobId: "job_1", type: "NORMAL_JOB" }),
      ).rejects.toThrow(BusinessException);
      expect(bookingRepoMock.create).not.toHaveBeenCalled();
    });

    it("rejects booking a nonexistent job", async () => {
      jobRepoMock.findById.mockResolvedValue(null);

      await expect(
        service.createBooking("provider_1", { jobId: "missing", type: "NORMAL_JOB" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("rejects booking a job with no budget set", async () => {
      jobRepoMock.findById.mockResolvedValue({ ...job, budget: null });

      await expect(
        service.createBooking("provider_1", { jobId: "job_1", type: "NORMAL_JOB" }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("settlePayment (Provider-initiated)", () => {
    it("settles an ONLINE booking normally", async () => {
      bookingRepoMock.findById.mockResolvedValue(onlineBooking);
      bookingRepoMock.update.mockResolvedValue({ ...onlineBooking, status: "PAYMENT_SETTLED" });

      await service.settlePayment("booking_1", "provider_1");

      expect(stateServiceMock.transition).toHaveBeenCalledWith("booking_1", "PAYMENT_SETTLED", expect.any(Object));
    });

    it("rejects settling an OFFLINE booking — the Provider can't unilaterally confirm cash was paid", async () => {
      bookingRepoMock.findById.mockResolvedValue(offlineBooking);

      await expect(service.settlePayment("booking_2", "provider_1")).rejects.toThrow(BusinessException);
      expect(stateServiceMock.transition).not.toHaveBeenCalled();
    });

    it("rejects a caller who isn't the booking's provider", async () => {
      bookingRepoMock.findById.mockResolvedValue(onlineBooking);

      await expect(service.settlePayment("booking_1", "someone_else")).rejects.toThrow(BusinessException);
      expect(stateServiceMock.transition).not.toHaveBeenCalled();
    });
  });

  describe("settleOfflinePayment (Worker-initiated)", () => {
    it("settles an OFFLINE booking when the assigned worker confirms", async () => {
      bookingRepoMock.findById.mockResolvedValue(offlineBooking);
      bookingRepoMock.update.mockResolvedValue({ ...offlineBooking, status: "PAYMENT_SETTLED" });

      await service.settleOfflinePayment("booking_2", "worker_1");

      expect(stateServiceMock.transition).toHaveBeenCalledWith("booking_2", "PAYMENT_SETTLED", expect.any(Object));
    });

    it("rejects an ONLINE booking — that path goes through settlePayment instead", async () => {
      bookingRepoMock.findById.mockResolvedValue(onlineBooking);

      await expect(service.settleOfflinePayment("booking_1", "worker_1")).rejects.toThrow(BusinessException);
    });

    it("rejects a caller who isn't the assigned worker", async () => {
      bookingRepoMock.findById.mockResolvedValue(offlineBooking);

      await expect(service.settleOfflinePayment("booking_2", "someone_else")).rejects.toThrow(BusinessException);
    });
  });
});
