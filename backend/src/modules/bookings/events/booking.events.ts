export const BookingEvents = {
  CREATED: 'booking.created',
  STATUS_CHANGED: 'booking.status_changed',
  CANCELLED: 'booking.cancelled',
  COMPLETED: 'booking.completed',
  PAYMENT_SETTLED: 'booking.payment_settled',
} as const;

export type BookingStatusChangedPayload = {
  bookingId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  reason?: string;
  changedAt: string;
};
