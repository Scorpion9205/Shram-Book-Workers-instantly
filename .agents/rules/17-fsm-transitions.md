# SHRAM Coding Rules — Booking FSM Transitions

## Rule 17: All Booking Status Transitions Through BookingStateService Only

The Booking status machine is the heart of the system. **No code outside `BookingStateService` may write to `booking.status`.** Every transition is validated, logged, and emitted as an event.

### Valid Transitions Map

```typescript
export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.CREATED]: [
    BookingStatus.PAYMENT_PENDING,
    BookingStatus.CANCELLED_BY_PROVIDER,
  ],
  [BookingStatus.PAYMENT_PENDING]: [
    BookingStatus.PAYMENT_CONFIRMED,
    BookingStatus.CANCELLED_BY_PROVIDER,
    BookingStatus.EXPIRED,
  ],
  [BookingStatus.PAYMENT_CONFIRMED]: [
    BookingStatus.WORKER_ASSIGNED,
    BookingStatus.CANCELLED_BY_PROVIDER,
  ],
  [BookingStatus.WORKER_ASSIGNED]: [
    BookingStatus.WORKER_EN_ROUTE,
    BookingStatus.CANCELLED_BY_WORKER,
    BookingStatus.CANCELLED_BY_PROVIDER,
  ],
  [BookingStatus.WORKER_EN_ROUTE]: [
    BookingStatus.OTP_VERIFIED,
    BookingStatus.CANCELLED_BY_WORKER,
  ],
  [BookingStatus.OTP_VERIFIED]: [BookingStatus.WORK_STARTED],
  [BookingStatus.WORK_STARTED]: [BookingStatus.WORK_COMPLETED],
  [BookingStatus.WORK_COMPLETED]: [BookingStatus.PAYMENT_SETTLED],
  [BookingStatus.PAYMENT_SETTLED]: [BookingStatus.REVIEWED, BookingStatus.CLOSED],
  [BookingStatus.REVIEWED]: [BookingStatus.CLOSED],
  // Terminal states — no transitions
  [BookingStatus.CLOSED]: [],
  [BookingStatus.CANCELLED_BY_PROVIDER]: [],
  [BookingStatus.CANCELLED_BY_WORKER]: [],
  [BookingStatus.EXPIRED]: [],
  [BookingStatus.DISPUTED]: [BookingStatus.CLOSED],
};
```

### BookingStateService Contract

```typescript
export class BookingStateService {
  async transition(
    bookingId: string,
    toStatus: BookingStatus,
    meta: { changedBy: string; reason?: string }
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking', bookingId);

    const allowed = VALID_TRANSITIONS[booking.status];
    if (!allowed.includes(toStatus)) {
      throw new BusinessException(
        'INVALID_TRANSITION',
        `Cannot move booking from ${booking.status} to ${toStatus}`
      );
    }

    // Atomic: update status + append history in one transaction
    const updated = await this.prisma.transaction(async (tx) => {
      const b = await this.bookingRepo.updateStatus(bookingId, toStatus, tx);
      await this.historyRepo.append(bookingId, booking.status, toStatus, meta, tx);
      return b;
    });

    // Emit domain event
    await this.eventPublisher.publish(BookingEvents.STATUS_CHANGED, {
      bookingId,
      fromStatus: booking.status,
      toStatus,
      changedBy: meta.changedBy,
      changedAt: new Date(),
    });

    return updated;
  }
}
```

### ❌ WRONG — Direct Status Updates

```typescript
// ❌ In PaymentService
await prisma.booking.update({ where: { id }, data: { status: 'PAYMENT_CONFIRMED' } });

// ❌ In InstantRequestService
booking.status = BookingStatus.WORKER_ASSIGNED;
await bookingRepo.save(booking);

// ❌ In controller
await bookingRepo.updateStatus(bookingId, 'CLOSED');
```
