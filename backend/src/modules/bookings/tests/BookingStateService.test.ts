import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingStateService } from "../services/BookingStateService.js";
import { BookingStatus } from "@prisma/client";
import { BookingFactory } from "../../../tests/factories/BookingFactory.js";
import { BusinessException, NotFoundException } from "../../../core/exceptions/index.js";

describe("BookingStateService", () => {
  let bookingRepoMock: any;
  let historyRepoMock: any;
  let eventPublisherMock: any;
  let prismaMock: any;
  let service: BookingStateService;

  beforeEach(() => {
    bookingRepoMock = {
      findById: vi.fn(),
      updateStatus: vi.fn(),
      updateStatusIfCurrent: vi.fn(),
    };
    historyRepoMock = {
      append: vi.fn(),
    };
    eventPublisherMock = {
      publish: vi.fn().mockResolvedValue(undefined),
    };
    prismaMock = {
      transaction: vi.fn((cb) => cb(prismaMock)),
    };

    service = new BookingStateService(
      bookingRepoMock,
      historyRepoMock,
      eventPublisherMock,
      prismaMock as any
    );
  });

  it("should successfully transition booking state on valid transitions", async () => {
    const booking = BookingFactory.create({ status: BookingStatus.CREATED });
    bookingRepoMock.findById.mockResolvedValue(booking);
    
    const updatedBooking = { ...booking, status: BookingStatus.PAYMENT_PENDING };
    bookingRepoMock.updateStatusIfCurrent.mockResolvedValue(updatedBooking);

    const result = await service.transition(booking.id, BookingStatus.PAYMENT_PENDING, {
      changedBy: "provider_1",
      reason: "Initiate payment",
    });

    expect(result.status).toBe(BookingStatus.PAYMENT_PENDING);
    expect(bookingRepoMock.findById).toHaveBeenCalledWith(booking.id);
    expect(historyRepoMock.append).toHaveBeenCalled();
    expect(eventPublisherMock.publish).toHaveBeenCalled();
  });

  it("should throw NotFoundException if booking does not exist", async () => {
    bookingRepoMock.findById.mockResolvedValue(null);

    await expect(
      service.transition("invalid_id", BookingStatus.PAYMENT_PENDING, {
        changedBy: "provider_1",
      })
    ).rejects.toThrow(NotFoundException);
  });

  it("should throw BusinessException if transition path is invalid", async () => {
    const booking = BookingFactory.create({ status: BookingStatus.CREATED });
    bookingRepoMock.findById.mockResolvedValue(booking);

    await expect(
      service.transition(booking.id, BookingStatus.WORK_COMPLETED, {
        changedBy: "provider_1",
      })
    ).rejects.toThrow(BusinessException);
  });

  it("should throw BusinessException on a concurrent status conflict instead of overwriting", async () => {
    const booking = BookingFactory.create({ status: BookingStatus.CREATED });
    bookingRepoMock.findById.mockResolvedValue(booking);
    // Simulates a concurrent transition winning the race: our conditional update matches 0 rows.
    bookingRepoMock.updateStatusIfCurrent.mockResolvedValue(null);

    await expect(
      service.transition(booking.id, BookingStatus.PAYMENT_PENDING, {
        changedBy: "provider_1",
        reason: "Initiate payment",
      })
    ).rejects.toThrow(BusinessException);

    expect(historyRepoMock.append).not.toHaveBeenCalled();
  });
});
