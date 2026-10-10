import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReviewService } from "../services/ReviewService.js";
import { BusinessException } from "../../../core/exceptions/index.js";

describe("ReviewService.createReview — rating update race condition", () => {
  let reviewRepoMock: any;
  let bookingRepoMock: any;
  let workerRepoMock: any;
  let prismaMock: any;
  let txMock: any;
  let service: ReviewService;

  const booking = { id: "booking_1", providerId: "provider_1", workerId: "worker_1", status: "WORK_COMPLETED" };
  const worker = { id: "worker_1", userId: "worker_user_1", rating: 4, totalReviews: 2, dailyRate: null, experience: 1 };

  beforeEach(() => {
    txMock = { workerProfile: { updateMany: vi.fn() } };

    reviewRepoMock = {
      create: vi.fn().mockResolvedValue({ id: "review_1" }),
      findByBookingId: vi.fn().mockResolvedValue(null),
    };
    bookingRepoMock = { findById: vi.fn().mockResolvedValue(booking) };
    workerRepoMock = { findById: vi.fn().mockResolvedValue(worker), updateProfile: vi.fn() };
    prismaMock = { client: { $transaction: vi.fn((cb: any) => cb(txMock)) } };

    service = new ReviewService(reviewRepoMock, bookingRepoMock, workerRepoMock, prismaMock);
  });

  it("updates rating/totalReviews atomically on the first attempt when there's no contention", async () => {
    txMock.workerProfile.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.createReview("booking_1", "provider_1", { rating: 5 });

    expect(txMock.workerProfile.updateMany).toHaveBeenCalledTimes(1);
    expect(txMock.workerProfile.updateMany).toHaveBeenCalledWith({
      where: { id: "worker_1", totalReviews: 2 },
      data: { rating: 4.33, totalReviews: { increment: 1 } },
    });
    expect(result.id).toBe("review_1");
  });

  it("retries with freshly-read data when a concurrent review already moved totalReviews", async () => {
    // First attempt loses the race (0 rows matched); second attempt sees the post-collision
    // state and succeeds.
    txMock.workerProfile.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    workerRepoMock.findById
      .mockResolvedValueOnce(worker) // totalReviews: 2, as read on attempt 1
      .mockResolvedValueOnce({ ...worker, rating: 4.5, totalReviews: 3 }); // after the other review landed

    await service.createReview("booking_1", "provider_1", { rating: 5 });

    expect(txMock.workerProfile.updateMany).toHaveBeenCalledTimes(2);
    expect(txMock.workerProfile.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "worker_1", totalReviews: 3 },
      data: { rating: 4.63, totalReviews: { increment: 1 } },
    });
  });

  it("gives up after repeated contention instead of looping forever", async () => {
    txMock.workerProfile.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.createReview("booking_1", "provider_1", { rating: 5 })).rejects.toThrow(BusinessException);
    expect(txMock.workerProfile.updateMany).toHaveBeenCalledTimes(5);
  });

  it("rejects a second review for the same booking", async () => {
    reviewRepoMock.findByBookingId.mockResolvedValue({ id: "existing_review" });

    await expect(service.createReview("booking_1", "provider_1", { rating: 5 })).rejects.toThrow(BusinessException);
    expect(reviewRepoMock.create).not.toHaveBeenCalled();
  });
});
