export const QueueNames = {
  NOTIFICATION: 'notification.queue',
  ANALYTICS: 'analytics.queue',
  CLEANUP: 'cleanup.queue',
} as const;

export const ExchangeNames = {
  EVENTS: 'shram.events',
  DLX: 'shram.dlx',
} as const;

export const RoutingKeys = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_STATUS_CHANGED: 'booking.status_changed',
  PAYMENT_SUCCESS: 'payment.success',
  INSTANT_REQUEST_ACCEPTED: 'instant_request.accepted',
  BID_SUBMITTED: 'bid.submitted',
  REVIEW_SUBMITTED: 'review.submitted',
  USER_REGISTERED: 'user.registered',
  OTP_SENT: 'otp.sent',
} as const;
