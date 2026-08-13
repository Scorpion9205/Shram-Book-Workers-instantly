# SHRAM Coding Rules — Side-Effects Are Event-Driven

## Rule 08: Side-Effects Go Through RabbitMQ Events, Never Inline in Services

A service method performs its primary business operation and **emits a domain event**. It does not directly send emails, SMS, push notifications, or write to analytics. These are side-effects handled by dedicated consumers.

### ✅ CORRECT — Emit and Return

```typescript
// In BookingService.create()
const booking = await this.bookingRepo.create(bookingData);

// Emit domain event — do NOT await the downstream side-effects
await this.eventPublisher.publish(BookingEvents.CREATED, {
  bookingId: booking.id,
  providerId: booking.providerId,
  workerId: booking.workerId,
  type: booking.type,
  estimatedFare: booking.estimatedFare,
});

return booking; // Return immediately — don't wait for email/SMS
```

### ❌ WRONG — Inline Side-Effects

```typescript
// ❌ Sending email directly inside service
await emailService.sendBookingConfirmed(provider.email, booking);

// ❌ Sending SMS directly inside service  
await smsService.send(worker.phone, `New booking: ${booking.id}`);

// ❌ Writing analytics directly inside service
await analyticsRepo.record({ event: 'booking_created', ... });
```

### Domain Events Reference

| Event Key | Publisher | Consumers |
|---|---|---|
| `booking.created` | BookingService | notification-worker, analytics-worker |
| `booking.status_changed` | BookingStateService | notification-worker, chat-worker, analytics-worker |
| `payment.success` | PaymentService | notification-worker, booking-worker |
| `instant_request.accepted` | InstantRequestService | notification-worker, booking-worker |
| `bid.submitted` | BiddingService | notification-worker |
| `review.submitted` | ReviewService | notification-worker, analytics-worker |
| `user.registered` | AuthService | notification-worker (welcome email) |
| `otp.sent` | OTPService | (logged only — no further consumers) |

### Exception: Fire-and-Forget Emails During Auth

Auth OTP emails/SMS are **synchronous** during the OTP flow because the user is waiting for that OTP. These are the only allowed direct email/SMS calls and must be wrapped in try/catch to prevent blocking registration.
