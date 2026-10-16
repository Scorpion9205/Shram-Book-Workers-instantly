import { BookingStatus } from '@prisma/client';

// The booking state machine: for each status, the list of statuses it may move to next.
// Happy path: CREATED -> (PAYMENT_PENDING -> PAYMENT_CONFIRMED) -> WORKER_ASSIGNED ->
// WORKER_EN_ROUTE -> OTP_VERIFIED -> WORK_STARTED -> WORK_COMPLETED -> PAYMENT_SETTLED -> REVIEWED/CLOSED.
// Empty arrays are terminal states: nothing can move out of them.
export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.CREATED]: [
    BookingStatus.PAYMENT_PENDING,
    BookingStatus.CANCELLED_BY_PROVIDER,
    BookingStatus.WORKER_EN_ROUTE,
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
