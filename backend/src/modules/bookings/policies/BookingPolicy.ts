import { BookingStatus } from '@prisma/client';
import { UserRole } from '../../../core/enums/Role.js';

/**
 * Policy class containing business/authorization rules for bookings.
 * Decouples controllers and services from hardcoded role permissions checks.
 */
export class BookingPolicy {
  static canView(booking: any, user: { id: string; role: string }): boolean {
    if (user.role === UserRole.ADMIN) return true;
    return booking.providerId === user.id || booking.worker?.userId === user.id || booking.agentId === user.id;
  }

  static canCancel(booking: any, user: { id: string; role: string }): boolean {
    if (user.role === UserRole.ADMIN) return true;

    // Cancellations can only happen before work actually starts
    const allowedCancelStates: BookingStatus[] = [
      BookingStatus.CREATED,
      BookingStatus.PAYMENT_PENDING,
      BookingStatus.PAYMENT_CONFIRMED,
      BookingStatus.WORKER_ASSIGNED,
      BookingStatus.WORKER_EN_ROUTE,
    ];

    if (!allowedCancelStates.includes(booking.status)) {
      return false;
    }

    return booking.providerId === user.id || booking.worker?.userId === user.id;
  }

  static canReview(booking: any, user: { id: string; role: string }): boolean {
    // Reviews can only be submitted after work completes
    if (booking.status !== BookingStatus.WORK_COMPLETED && booking.status !== BookingStatus.PAYMENT_SETTLED) {
      return false;
    }
    return booking.providerId === user.id || booking.worker?.userId === user.id;
  }
}
