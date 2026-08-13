# SHRAM Coding Rules — Booking Is the Aggregate Root

## Rule 07: Booking Is the Aggregate Root — Never Mutate Status Directly

**Booking** is the central entity of the entire domain. Every payment, OTP, chat, review, and notification references a `Booking`. No module may mutate `booking.status` directly — all state transitions go through `BookingStateService`.

### Booking State Machine

```
CREATED
  → PAYMENT_PENDING → PAYMENT_CONFIRMED
      → WORKER_ASSIGNED
          → WORKER_EN_ROUTE
              → OTP_VERIFIED → WORK_STARTED
                  → WORK_COMPLETED
                      → PAYMENT_SETTLED
                          → REVIEWED → CLOSED

  (terminal error branches):
  CANCELLED_BY_PROVIDER | CANCELLED_BY_WORKER | EXPIRED | DISPUTED
```

### ✅ CORRECT — Transition Through BookingStateService

```typescript
// In BookingService
await this.bookingStateService.transition(
  bookingId,
  BookingStatus.WORKER_ASSIGNED,
  { changedBy: agentId, reason: 'Worker accepted' }
);
// BookingStateService validates the transition, writes BookingStatusHistory, emits event
```

### ❌ WRONG — Direct Status Mutation

```typescript
// ❌ Direct Prisma update of booking.status in any service other than BookingStateService
await prisma.booking.update({
  where: { id: bookingId },
  data: { status: 'WORKER_ASSIGNED' },
});

// ❌ Mutating status in a controller
booking.status = BookingStatus.CANCELLED_BY_PROVIDER;
await bookingRepo.save(booking);
```

### Every Module References Booking, Not the Other Way Around

- `Payment` references `bookingId` — not the reverse (Booking has a virtual `payment` relation)
- `ChatThread` references `bookingId`
- `Review` references `bookingId`
- `Otp` (WORK_START purpose) references `bookingId`
- `Notification` log references `bookingId` (optional)

### Domain Events on Transition

Every successful `BookingStateService.transition()` publishes `booking.status_changed` on RabbitMQ with:
```typescript
{ bookingId, fromStatus, toStatus, changedBy, changedAt }
```
Consumers: `notification-worker`, `analytics-worker`, `chat-worker`.
