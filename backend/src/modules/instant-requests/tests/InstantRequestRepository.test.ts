import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstantRequestRepository } from "../repositories/InstantRequestRepository.js";

describe("InstantRequestRepository.createBooking", () => {
  let prismaServiceMock: any;
  let repo: InstantRequestRepository;

  beforeEach(() => {
    prismaServiceMock = {
      client: { booking: { create: vi.fn().mockResolvedValue({ id: "booking_1" }) } },
    };
    repo = new InstantRequestRepository(prismaServiceMock);
  });

  it("always creates instant-request bookings as OFFLINE, since no Razorpay payment is ever collected for them", async () => {
    await repo.createBooking({
      providerId: "provider_1",
      workerId: "worker_1",
      instantRequestId: "req_1",
      amount: 500,
      status: "WORKER_ASSIGNED",
      startOtp: "hashed_otp",
    });

    expect(prismaServiceMock.client.booking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ paymentMode: "OFFLINE" }),
    });
  });
});
