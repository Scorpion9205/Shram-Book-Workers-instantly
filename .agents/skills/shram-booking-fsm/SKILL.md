---
name: shram-booking-fsm
description: >-
  Use this skill when implementing the Booking state machine (FSM) in SHRAM:
  BookingStateService, valid transitions map, history logging, and domain event
  emission on state change. Activate when: user asks about booking status
  transitions, how to change booking status, implementing OTP verification flow,
  or adding new states to the Booking FSM.
---

# SHRAM — Booking Finite State Machine

## State Machine Overview

```
CREATED
  → PAYMENT_PENDING        (Provider initiates payment)
  → PAYMENT_CONFIRMED      (Razorpay webhook confirms payment)
  → WORKER_ASSIGNED        (Agent or auto-assign selects worker)
  → WORKER_EN_ROUTE        (Worker taps "On the way" + OTP sent to Provider)
  → OTP_VERIFIED           (Provider reads OTP to Worker who enters it)
  → WORK_STARTED           (Work begins)
  → WORK_COMPLETED         (Provider confirms completion)
  → PAYMENT_SETTLED        (Platform releases funds to worker wallet)
  → REVIEWED               (Both parties submit reviews)
  → CLOSED                 (Terminal)

Error branches (any point before WORK_STARTED):
  → CANCELLED_BY_PROVIDER
  → CANCELLED_BY_WORKER
  → EXPIRED
  → DISPUTED               (future — opens after WORK_STARTED)
```

## Implementation

```typescript
// modules/bookings/services/BookingStateService.ts
import { Booking, BookingStatus } from '@prisma/client';
import { BusinessException, NotFoundException } from '../../../core/exceptions/index.js';
import type { IBookingRepository } from '../interfaces/IBookingRepository.js';
import type { IBookingHistoryRepository } from '../interfaces/IBookingHistoryRepository.js';
import type { IEventPublisher } from '../../../core/interfaces/IEventPublisher.js';
import type { PrismaService } from '../../../database/prisma/prisma.service.js';
import { VALID_TRANSITIONS } from '../constants/booking-transitions.constants.js';
import { BookingEvents } from '../events/booking.events.js';

export interface TransitionMeta {
  changedBy: string;
  reason?: string;
}

export class BookingStateService {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly historyRepo: IBookingHistoryRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly prisma: PrismaService,
  ) {}

  async transition(
    bookingId: string,
    toStatus: BookingStatus,
    meta: TransitionMeta,
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking', bookingId);

    this.validateTransition(booking.status, toStatus, bookingId);

    const updated = await this.prisma.transaction(async (tx) => {
      const b = await this.bookingRepo.updateStatus(bookingId, toStatus, tx);
      await this.historyRepo.append(
        { bookingId, fromStatus: booking.status, toStatus, changedBy: meta.changedBy, reason: meta.reason },
        tx,
      );
      return b;
    });

    await this.emitStatusChanged(bookingId, booking.status, toStatus, meta);

    return updated;
  }

  private validateTransition(from: BookingStatus, to: BookingStatus, bookingId: string): void {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BusinessException(
        'INVALID_BOOKING_TRANSITION',
        `Cannot transition booking ${bookingId} from ${from} to ${to}. Allowed: [${allowed.join(', ')}]`,
      );
    }
  }

  private async emitStatusChanged(
    bookingId: string,
    fromStatus: BookingStatus,
    toStatus: BookingStatus,
    meta: TransitionMeta,
  ): Promise<void> {
    await this.eventPublisher.publish(BookingEvents.STATUS_CHANGED, {
      bookingId,
      fromStatus,
      toStatus,
      changedBy: meta.changedBy,
      reason: meta.reason,
      changedAt: new Date().toISOString(),
    });
  }
}
```

## Transition Constants

```typescript
// modules/bookings/constants/booking-transitions.constants.ts
import { BookingStatus } from '@prisma/client';

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
  [BookingStatus.CLOSED]: [],
  [BookingStatus.CANCELLED_BY_PROVIDER]: [],
  [BookingStatus.CANCELLED_BY_WORKER]: [],
  [BookingStatus.EXPIRED]: [],
  [BookingStatus.DISPUTED]: [BookingStatus.CLOSED],
};
```

## Usage in Other Services

```typescript
// In PaymentService — after Razorpay webhook confirms payment
await this.bookingStateService.transition(
  payment.bookingId,
  BookingStatus.PAYMENT_CONFIRMED,
  { changedBy: 'SYSTEM', reason: 'Razorpay webhook confirmed payment' }
);

// In WorkerService — worker accepts and marks en route
await this.bookingStateService.transition(
  bookingId,
  BookingStatus.WORKER_EN_ROUTE,
  { changedBy: workerId, reason: 'Worker is on the way' }
);

// In OTPService — work-start OTP verified
await this.bookingStateService.transition(
  booking.id,
  BookingStatus.OTP_VERIFIED,
  { changedBy: providerId, reason: 'Work-start OTP verified' }
);
```

## Domain Events on Transition

```typescript
// modules/bookings/events/booking.events.ts
export const BookingEvents = {
  CREATED: 'booking.created',
  STATUS_CHANGED: 'booking.status_changed',
  CANCELLED: 'booking.cancelled',
  COMPLETED: 'booking.completed',
  PAYMENT_SETTLED: 'booking.payment_settled',
} as const;

// Payload for STATUS_CHANGED
export type BookingStatusChangedPayload = {
  bookingId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  reason?: string;
  changedAt: string;
};
```

## Notification Consumer Actions per Status

| toStatus | Notification Action |
|---|---|
| `PAYMENT_CONFIRMED` | Email + Push: "Booking confirmed! Worker assigned." |
| `WORKER_EN_ROUTE` | SMS to Provider: Work-start OTP code |
| `OTP_VERIFIED` | Push to Provider + Worker: "Work has started" |
| `WORK_COMPLETED` | Push + Email: "Work completed. Please review." |
| `CANCELLED_BY_PROVIDER` | SMS + Push to Worker: "Booking cancelled" |
| `CANCELLED_BY_WORKER` | SMS + Push to Provider: "Worker cancelled, rebooking..." |
