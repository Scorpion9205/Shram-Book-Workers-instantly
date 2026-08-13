import { Booking, BookingStatus } from '@prisma/client';

export interface TransitionMeta {
  changedBy: string;
  reason?: string;
}

export interface IBookingStateService {
  transition(
    bookingId: string,
    toStatus: BookingStatus,
    meta: TransitionMeta,
  ): Promise<Booking>;
}
