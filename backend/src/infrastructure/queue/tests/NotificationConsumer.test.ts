import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationConsumer } from "../consumers/NotificationConsumer.js";
import { NotificationType } from "../../../modules/notifications/enums/NotificationType.js";

describe("NotificationConsumer", () => {
  let dispatcherMock: { dispatch: ReturnType<typeof vi.fn> };
  let bookingRepoMock: { findById: ReturnType<typeof vi.fn> };
  let consumer: NotificationConsumer;

  const booking = {
    id: "abcdef12-3456-7890-abcd-ef1234567890",
    providerId: "provider_1",
    amount: 500,
    finalFare: null,
    provider: { name: "Rahul Provider" },
    worker: { user: { name: "Suresh Worker" } },
  };

  // handleEvent is private; the real entry point is the queue callback, so call it directly.
  const handle = (routingKey: string, payload: any) => (consumer as any).handleEvent(routingKey, payload);

  beforeEach(() => {
    dispatcherMock = { dispatch: vi.fn().mockResolvedValue(undefined) };
    bookingRepoMock = { findById: vi.fn().mockResolvedValue(booking) };
    consumer = new NotificationConsumer({} as any, dispatcherMock as any, bookingRepoMock as any);
  });

  it("booking.created emails the provider with their real name, a short booking id and the worker name", async () => {
    await handle("booking.created", { id: booking.id });

    expect(dispatcherMock.dispatch).toHaveBeenCalledWith({
      type: NotificationType.BOOKING_CREATED,
      userId: "provider_1",
      data: { name: "Rahul Provider", bookingId: "ABCDEF12", workerName: "Suresh Worker", scheduledFor: "" },
    });
  });

  it.each([
    ["WORKER_ASSIGNED", NotificationType.BOOKING_CONFIRMED],
    ["WORK_STARTED", NotificationType.WORK_STARTED],
    ["WORK_COMPLETED", NotificationType.WORK_COMPLETED],
    ["PAYMENT_SETTLED", NotificationType.PAYMENT_RECEIPT],
    ["CANCELLED_BY_PROVIDER", NotificationType.BOOKING_CANCELLED],
    ["CANCELLED_BY_WORKER", NotificationType.BOOKING_CANCELLED],
  ])("status change to %s sends %s to the provider, with data loaded from the booking", async (toStatus, type) => {
    await handle("booking.status_changed", { bookingId: booking.id, toStatus, reason: "Because" });

    expect(bookingRepoMock.findById).toHaveBeenCalledWith(booking.id);
    expect(dispatcherMock.dispatch).toHaveBeenCalledWith({
      type,
      userId: "provider_1",
      data: {
        providerName: "Rahul Provider",
        workerName: "Suresh Worker",
        bookingShortId: "ABCDEF12",
        amount: 500,
        scheduledFor: "",
        reason: "Because",
      },
    });
  });

  it("ignores status changes that have no notification (e.g. WORKER_EN_ROUTE)", async () => {
    await handle("booking.status_changed", { bookingId: booking.id, toStatus: "WORKER_EN_ROUTE" });

    expect(dispatcherMock.dispatch).not.toHaveBeenCalled();
    expect(bookingRepoMock.findById).not.toHaveBeenCalled();
  });

  it("does nothing when the booking can't be found", async () => {
    bookingRepoMock.findById.mockResolvedValue(null);

    await handle("booking.created", { id: "missing" });

    expect(dispatcherMock.dispatch).not.toHaveBeenCalled();
  });

  it("uses the settled final fare for the receipt amount when there is one", async () => {
    bookingRepoMock.findById.mockResolvedValue({ ...booking, finalFare: 650 });

    await handle("booking.status_changed", { bookingId: booking.id, toStatus: "PAYMENT_SETTLED" });

    expect(dispatcherMock.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 650 }) }),
    );
  });
});
