import type { Booking } from '@prisma/client';

export interface BookingResponseDto {
  id: string;
  jobId: string | null;
  providerId: string;
  workerId: string | null;
  agentId: string | null;
  amount: number;
  estimatedFare: number;
  finalFare: number | null;
  status: string;
  type: string;
  address: any;
  notes: string | null;
  durationHours: number | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  provider?: any;
  worker?: any;
  job?: any;
  instantRequest?: any;
  statusHistory?: any[];
  startOtp?: string | null;
  paymentMode?: string;
}

export class BookingMapper {
  // NOTE: `booking.startOtp` is intentionally NEVER included here — since it now stores an
  // Argon2id hash (not plaintext), returning it here would leak the hash for no benefit and
  // formerly leaked the plaintext to every socket listener in a booking's rooms (both
  // Provider AND Worker), defeating the OTP's purpose. The one legitimate place the Provider
  // needs to see the plaintext code is BookingController.getBookingById, which overlays it
  // explicitly from the short-lived cache entry written at booking-creation time.
  static toResponse(booking: any, currentUser?: any): BookingResponseDto {
    return {
      id: booking.id,
      jobId: booking.jobId,
      providerId: booking.providerId,
      workerId: booking.workerId,
      agentId: booking.agentId,
      amount: Number(booking.amount),
      estimatedFare: Number(booking.estimatedFare),
      finalFare: booking.finalFare ? Number(booking.finalFare) : null,
      status: booking.status,
      type: booking.type,
      paymentMode: booking.paymentMode,
      address: booking.address,
      notes: booking.notes,
      durationHours: booking.durationHours ? Number(booking.durationHours) : null,
      scheduledAt: booking.scheduledAt ? booking.scheduledAt.toISOString() : null,
      startedAt: booking.startedAt ? booking.startedAt.toISOString() : null,
      completedAt: booking.completedAt ? booking.completedAt.toISOString() : null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      ...(booking.provider && { provider: booking.provider }),
      ...(booking.worker && { worker: booking.worker }),
      ...(booking.job && { job: booking.job }),
      ...(booking.instantRequest && { instantRequest: booking.instantRequest }),
      ...(booking.statusHistory && {
        statusHistory: booking.statusHistory.map((h: any) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          changedBy: h.changedBy,
          reason: h.reason,
          changedAt: h.changedAt.toISOString(),
        })),
      }),
    };
  }

  static toResponseList(bookings: any[], currentUser?: any): BookingResponseDto[] {
    return bookings.map(b => this.toResponse(b, currentUser));
  }
}
